const Booking = require("../booking/bookingModel");
const Organizer = require("../organizer/organizerModel");
const Itinerary = require("./itineraryModel");
const PickupPoint = require("./pickupPointModel");
const Trip = require("./tripModel");
const GroupChat = require("../groupChat/groupChatModel");
const { ensureTripGroupChat } = require("../groupChat/groupChatController");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDayRange = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const shapeOrganizer = (organizer) => {
  if (!organizer) {
    return null;
  }

  return {
    _id: organizer._id,
    businessName: organizer.businessName,
    approvalStatus: organizer.approvalStatus,
    userId: organizer.userId,
    trustScore: organizer.userId?.trustScore || 0,
  };
};

const getApprovedOrganizer = (userId) =>
  Organizer.findOne({ userId, approvalStatus: "approved" });

const TRIP_IMAGE_TRANSFORMATIONS = {
  width: 1600,
  crop: "limit",
  quality: "auto",
  fetch_format: "auto",
  dpr: "auto",
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  return null;
};

const parseBooleanInput = (value, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const normalizeCityName = (value = "") => String(value || "").trim().replace(/\s+/g, " ");
const getGeoapifyApiKey = () => {
  const rawValue = String(process.env.GEOAPIFY_API_KEY || "").trim();
  if (!rawValue) return "";
  if (rawValue.includes("apiKey=")) {
    try {
      const parsedUrl = new URL(rawValue);
      return String(parsedUrl.searchParams.get("apiKey") || "").trim();
    } catch (_error) {
      const match = /[?&]apiKey=([^&]+)/i.exec(rawValue);
      return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    }
  }
  return rawValue;
};

const buildSuggestionValue = ({ city, state, country }) =>
  normalizeCityName([city, state, country].filter(Boolean).join(", "));

const getCitySuggestions = async (req, res) => {
  try {
    const query = normalizeCityName(req.query.q || "");
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 10)));
    if (!query) {
      return res.status(200).json({
        items: [],
        legacyItems: [],
        meta: { query, limit },
      });
    }

    const countryFilter = String(process.env.LOCATION_COUNTRY_FILTER || "in")
      .trim()
      .toLowerCase();
    const geoapifyApiKey = getGeoapifyApiKey();
    if (geoapifyApiKey) {
      try {
        const autoUrl = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
        autoUrl.searchParams.set("text", query);
        autoUrl.searchParams.set("format", "json");
        autoUrl.searchParams.set("type", "city");
        autoUrl.searchParams.set("limit", String(Math.min(50, limit * 3)));
        autoUrl.searchParams.set("filter", `countrycode:${countryFilter}`);
        autoUrl.searchParams.set("apiKey", geoapifyApiKey);

        const autoRes = await fetch(autoUrl.toString());
        const autoPayload = await autoRes.json().catch(() => null);
        if (autoRes.ok) {
          const rawResults = Array.isArray(autoPayload?.results) ? autoPayload.results : [];
          const items = [];
          const legacyItems = [];
          const seen = new Set();

          for (const result of rawResults) {
            const city = normalizeCityName(
              result?.city || result?.town || result?.village || result?.municipality || result?.county || "",
            );
            const state = normalizeCityName(result?.state || result?.state_district || "");
            const country = normalizeCityName(result?.country || "");
            const value = buildSuggestionValue({ city, state, country });
            if (!value) continue;

            const lat = Number(result?.lat);
            const lon = Number(result?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

            const key = value.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            items.push({
              label: normalizeCityName(result?.formatted || value),
              value,
              city,
              state,
              country,
              countryCode: String(result?.country_code || "").trim().toLowerCase(),
              latitude: lat,
              longitude: lon,
            });
            legacyItems.push(value);

            if (items.length >= limit) break;
          }

          if (items.length > 0) {
            return res.status(200).json({
              items,
              legacyItems,
              meta: { query, limit, source: "geoapify-autocomplete" },
            });
          }
        }
      } catch (_geoapifyError) {
        // Fall through to Nominatim fallback.
      }
    }

    const osmUrl = new URL("https://nominatim.openstreetmap.org/search");
    osmUrl.searchParams.set("q", query);
    osmUrl.searchParams.set("format", "jsonv2");
    osmUrl.searchParams.set("addressdetails", "1");
    osmUrl.searchParams.set("limit", String(Math.min(50, limit * 3)));
    osmUrl.searchParams.set("accept-language", "en");
    osmUrl.searchParams.set("countrycodes", countryFilter);
    osmUrl.searchParams.set("dedupe", "1");

    if (process.env.NOMINATIM_EMAIL) {
      osmUrl.searchParams.set("email", process.env.NOMINATIM_EMAIL);
    }

    const response = await fetch(osmUrl.toString(), {
      headers: {
        "User-Agent":
          process.env.NOMINATIM_USER_AGENT ||
          "BagPacker/1.0 (OpenStreetMap city autocomplete)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rawItems = Array.isArray(payload) ? payload : [];
    const deduped = [];
    const seen = new Set();
    const legacyItems = [];

    for (const item of rawItems) {
      const address = item?.address || {};
      const cityCandidate =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state_district ||
        item?.name ||
        "";
      const normalized = normalizeCityName(cityCandidate);
      if (!normalized) {
        continue;
      }

      const stateCandidate = normalizeCityName(
        address.state || address.state_district || address.county || "",
      );
      const countryCandidate = normalizeCityName(address.country || "");
      const countryCode = String(address.country_code || "").trim().toLowerCase();
      const latitude = Number(item?.lat);
      const longitude = Number(item?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      const value = normalizeCityName(
        [normalized, stateCandidate, countryCandidate].filter(Boolean).join(", "),
      );
      if (!value) {
        continue;
      }

      const key = value.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push({
        label: normalizeCityName(item?.display_name || value),
        value,
        city: normalized,
        state: stateCandidate,
        country: countryCandidate,
        countryCode,
        latitude,
        longitude,
      });
      legacyItems.push(value);

      if (deduped.length >= limit) {
        break;
      }
    }

    return res.status(200).json({
      items: deduped,
      legacyItems,
      meta: {
        query,
        limit,
        source: "openstreetmap-nominatim",
      },
    });
  } catch (error) {
    return res.status(200).json({
      items: [],
      legacyItems: [],
      meta: {
        query: normalizeCityName(req.query.q || ""),
        limit: Math.min(20, Math.max(1, Number(req.query.limit || 10))),
        source: "openstreetmap-nominatim",
      },
      warning: error.message,
    });
  }
};

const validateTripArrays = (parsedItinerary, parsedPickupPoints) => {
  if (parsedItinerary !== undefined) {
    if (!Array.isArray(parsedItinerary)) {
      return "Itinerary must be an array";
    }

    if (!parsedItinerary.length) {
      return "Itinerary cannot be empty";
    }

    const invalidItineraryItem = parsedItinerary.find(
      (item) => !item || !String(item.activities || "").trim(),
    );
    if (invalidItineraryItem) {
      return "Each itinerary day must include activities";
    }
  }

  if (parsedPickupPoints !== undefined) {
    if (!Array.isArray(parsedPickupPoints)) {
      return "pickupPoints must be an array";
    }

    if (!parsedPickupPoints.length) {
      return "pickupPoints cannot be empty";
    }

    const invalidPickupItem = parsedPickupPoints.find(
      (item) => !item || !String(item.location || "").trim() || !String(item.time || "").trim(),
    );
    if (invalidPickupItem) {
      return "Each pickup point must include location and time";
    }
  }

  return "";
};

const TRIP_CACHE = new Map();
const TRIP_CACHE_TTL = 60_000; // 60 seconds

const getTrips = async (req, res) => {
  try {
    const cacheKey = JSON.stringify(req.query);
    const cached = TRIP_CACHE.get(cacheKey);
    if (cached && cached.expireAt > Date.now()) {
      return res.status(200).json(cached.data);
    }

    const filters = {};
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    if (req.query.includeAllStatuses !== "true") {
      filters.status = "active";
    }

    if (req.query.status) {
      filters.status = req.query.status.trim();
    }

    if (req.query.organizerId) {
      filters.organizerId = req.query.organizerId.trim();
    }

    if (req.query.transportType) {
      filters.transportType = req.query.transportType.trim();
    }

    if (req.query.paymentEnabled !== undefined) {
      filters.paymentEnabled = parseBooleanInput(req.query.paymentEnabled, true);
    }

    const buildFlexibleLocationFilter = (queryValue) => {
      const trimmed = String(queryValue || "").trim();
      if (!trimmed) return null;

      const words = trimmed
        .split(/[\s,.\-/]+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      const significantWords = words.filter((w) => w.length > 2);
      const wordsToUse = significantWords.length > 0 ? significantWords : words;

      if (wordsToUse.length === 0) return null;

      // Use a single regex but ensure it's a string for aggregation compatibility
      const pattern = wordsToUse.map((w) => escapeRegex(w)).join("|");
      return { $regex: pattern, $options: "i" };
    };

    if (req.query.source) {
      const sourceFilter = buildFlexibleLocationFilter(req.query.source);
      if (sourceFilter) filters.source = sourceFilter;
    }

    if (req.query.destination) {
      const destinationFilter = buildFlexibleLocationFilter(req.query.destination);
      if (destinationFilter) filters.destination = destinationFilter;
    }

    if (req.query.date) {
      const range = getDayRange(req.query.date);
      if (range) {
        filters.startDate = { $gte: range.start, $lte: range.end };
      }
    }

    if (req.query.priceMax !== undefined) {
      const priceMax = Number(req.query.priceMax);
      if (Number.isFinite(priceMax)) {
        filters.pricePerPerson = { $lte: priceMax };
      }
    }

    if (req.query.seatsMin !== undefined) {
      const seatsMin = Number(req.query.seatsMin);
      if (Number.isFinite(seatsMin)) {
        filters.availableSeats = { $gte: seatsMin };
      }
    }

    // Run the aggregation and derive organizer IDs, then fetch organizers in parallel
    // We can't avoid one sequential step (we need trip IDs to fetch organizers),
    // but we kick off the aggregation now and immediately after fetch organizers.
    const [result] = await Trip.aggregate([
      { $match: filters },
      { $sort: { startDate: 1, createdAt: -1 } },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $project: {
                title: 1, source: 1, destination: 1, startDate: 1, endDate: 1,
                pricePerPerson: 1, totalSeats: 1, availableSeats: 1, status: 1,
                transportType: 1, paymentEnabled: 1, startedAt: 1,
                images: 1, organizerId: 1, createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const total = result.totalCount[0]?.count || 0;
    const tripIds = result.items.map((t) => t.organizerId);

    const organizers = await Organizer.find({ _id: { $in: tripIds } })
      .select("businessName approvalStatus userId")
      .populate({ path: "userId", select: "name trustScore verificationStatus" })
      .lean();

    const organizerMap = new Map(organizers.map((o) => [String(o._id), o]));

    const mappedTrips = result.items.map((trip) => ({
      ...trip,
      organizerId: shapeOrganizer(organizerMap.get(String(trip.organizerId)) || null),
    }));

    const responseData = {
      items: mappedTrips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };

    TRIP_CACHE.set(cacheKey, {
      data: responseData,
      expireAt: Date.now() + TRIP_CACHE_TTL,
    });

    if (TRIP_CACHE.size > 100) {
      const firstKey = TRIP_CACHE.keys().next().value;
      TRIP_CACHE.delete(firstKey);
    }

    // Allow CDN / browser to cache public trip listings for 30 s, serve stale for 60 s
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate({
      path: "organizerId",
      select: "businessName approvalStatus userId",
      populate: {
        path: "userId",
        select: "name trustScore verificationStatus",
      },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const [itinerary, pickupPoints] = await Promise.all([
      Itinerary.find({ tripId: trip._id }).sort({ dayNumber: 1 }),
      PickupPoint.find({ tripId: trip._id }).sort({ sequence: 1 }),
    ]);

    const tripObject = trip.toObject();

    return res.status(200).json({
      ...tripObject,
      organizerId: shapeOrganizer(tripObject.organizerId),
      itinerary,
      pickupPoints,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createTrip = async (req, res) => {
  try {
    const organizer = await getApprovedOrganizer(req.user._id);

    if (!organizer) {
      return res.status(403).json({ message: "Only approved organizers can create trips" });
    }

    const {
      title,
      description,
      source,
      destination,
      startDate,
      endDate,
      pricePerPerson,
      totalSeats,
      transportType,
      paymentEnabled,
      itinerary,
      pickupPoints,
    } = req.body;

    const parsedItinerary = parseJsonArray(itinerary);
    const parsedPickupPoints = parseJsonArray(pickupPoints);

    const arrayValidationMessage = validateTripArrays(parsedItinerary, parsedPickupPoints);
    if (arrayValidationMessage) {
      return res.status(400).json({ message: arrayValidationMessage });
    }

    const tripImages = Array.isArray(req.files)
      ? await Promise.all(
          req.files.map(async (file) => {
            const uploadedImage = await uploadBufferToCloudinary({
              buffer: file.buffer,
              originalname: file.originalname,
              folder: "bagpacker/trip-images",
              resourceType: "image",
              transformations: TRIP_IMAGE_TRANSFORMATIONS,
            });
            return uploadedImage.secure_url;
          }),
        )
      : [];

    const trip = await Trip.create({
      organizerId: organizer._id,
      title: title.trim(),
      description: description ? description.trim() : "",
      source: source.trim(),
      destination: destination.trim(),
      transportType: String(transportType || "bus").trim(),
      startDate,
      endDate,
      pricePerPerson,
      totalSeats,
      availableSeats: totalSeats,
      paymentEnabled: parseBooleanInput(paymentEnabled, true),
      images: tripImages,
    });

    const createdItinerary = await Itinerary.insertMany(
      parsedItinerary.map((item, index) => ({
        tripId: trip._id,
        dayNumber: Number(item.dayNumber || index + 1),
        activities: String(item.activities || "").trim(),
        accommodation: item.accommodation ? String(item.accommodation).trim() : null,
      })),
    );

    const createdPickupPoints = await PickupPoint.insertMany(
      parsedPickupPoints.map((item, index) => ({
        tripId: trip._id,
        location: String(item.location || "").trim(),
        time: String(item.time || "").trim(),
        sequence: Number(item.sequence || index + 1),
      })),
    );

    await ensureTripGroupChat({ tripId: trip._id, organizerUserId: req.user._id });

    return res.status(201).json({
      ...trip.toObject(),
      itinerary: createdItinerary,
      pickupPoints: createdPickupPoints,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTrip = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id, approvalStatus: "approved" });

    if (!organizer) {
      return res.status(403).json({ message: "Only approved organizers can edit trips" });
    }

    const trip = await Trip.findOne({ _id: req.params.id, organizerId: organizer._id });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const parsedItinerary =
      req.body.itinerary !== undefined ? parseJsonArray(req.body.itinerary) : undefined;
    const parsedPickupPoints =
      req.body.pickupPoints !== undefined ? parseJsonArray(req.body.pickupPoints) : undefined;
    const arrayValidationMessage = validateTripArrays(parsedItinerary, parsedPickupPoints);

    if (arrayValidationMessage) {
      return res.status(400).json({ message: arrayValidationMessage });
    }

    [
      "title",
      "description",
      "source",
      "destination",
      "startDate",
      "endDate",
      "pricePerPerson",
      "transportType",
      "status",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] =
          typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    });

    if (req.body.paymentEnabled !== undefined) {
      trip.paymentEnabled = parseBooleanInput(req.body.paymentEnabled, Boolean(trip.paymentEnabled));
    }

    if (req.body.totalSeats !== undefined) {
      const bookedSeats = trip.totalSeats - trip.availableSeats;

      if (req.body.totalSeats < bookedSeats) {
        return res.status(400).json({
          message: "Total seats cannot be lower than already booked seats",
        });
      }

      trip.totalSeats = req.body.totalSeats;
      trip.availableSeats = req.body.totalSeats - bookedSeats;
    }

    await trip.save();

    let createdItinerary = null;
    if (parsedItinerary !== undefined) {
      await Itinerary.deleteMany({ tripId: trip._id });
      createdItinerary = await Itinerary.insertMany(
        parsedItinerary.map((item, index) => ({
          tripId: trip._id,
          dayNumber: Number(item.dayNumber || index + 1),
          activities: String(item.activities || "").trim(),
          accommodation: item.accommodation ? String(item.accommodation).trim() : null,
        })),
      );
    }

    let createdPickupPoints = null;
    if (parsedPickupPoints !== undefined) {
      await PickupPoint.deleteMany({ tripId: trip._id });
      createdPickupPoints = await PickupPoint.insertMany(
        parsedPickupPoints.map((item, index) => ({
          tripId: trip._id,
          location: String(item.location || "").trim(),
          time: String(item.time || "").trim(),
          sequence: Number(item.sequence || index + 1),
        })),
      );
    }

    const [finalItinerary, finalPickupPoints] = await Promise.all([
      createdItinerary ?? Itinerary.find({ tripId: trip._id }).sort({ dayNumber: 1 }),
      createdPickupPoints ?? PickupPoint.find({ tripId: trip._id }).sort({ sequence: 1 }),
    ]);

    return res.status(200).json({
      ...trip.toObject(),
      itinerary: finalItinerary,
      pickupPoints: finalPickupPoints,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const trip = await Trip.findOne({ _id: req.params.id, organizerId: organizer._id });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const confirmedBookings = await Booking.countDocuments({ tripId: trip._id, status: "confirmed" });
    if (confirmedBookings > 0) {
      return res.status(400).json({
        message: "Cannot delete a trip with confirmed bookings. Cancel the trip instead.",
      });
    }

    await trip.deleteOne();

    await Promise.all([
      Itinerary.deleteMany({ tripId: trip._id }),
      PickupPoint.deleteMany({ tripId: trip._id }),
      Booking.deleteMany({ tripId: trip._id }),
      GroupChat.deleteMany({ tripId: trip._id }),
    ]);

    return res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const startTrip = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id, approvalStatus: "approved" });
    if (!organizer) {
      return res.status(403).json({ message: "Only approved organizers can start trips" });
    }

    const trip = await Trip.findOne({ _id: req.params.id, organizerId: organizer._id });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.status !== "active") {
      return res.status(400).json({ message: "Only active trips can be started" });
    }

    if (trip.startedAt) {
      return res.status(400).json({ message: "Trip has already been started" });
    }

    trip.startedAt = new Date();
    await trip.save();

    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTrips,
  getCitySuggestions,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  startTrip,
};
