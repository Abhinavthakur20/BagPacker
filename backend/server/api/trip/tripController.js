const Booking = require("../booking/bookingModel");
const Organizer = require("../organizer/organizerModel");
const Itinerary = require("./itineraryModel");
const PickupPoint = require("./pickupPointModel");
const Trip = require("./tripModel");
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

const getTrips = async (req, res) => {
  try {
    const filters = {};
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const usePagination = true;

    if (req.query.includeAllStatuses !== "true") {
      filters.status = "active";
    }

    if (req.query.status) {
      filters.status = req.query.status.trim();
    }

    if (req.query.organizerId) {
      filters.organizerId = req.query.organizerId.trim();
    }

    if (req.query.source) {
      filters.source = { $regex: escapeRegex(req.query.source.trim()), $options: "i" };
    }

    if (req.query.destination) {
      filters.destination = {
        $regex: escapeRegex(req.query.destination.trim()),
        $options: "i",
      };
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

    const listQuery = Trip.find(filters)
      .select(
        "title source destination startDate endDate pricePerPerson totalSeats availableSeats status images organizerId createdAt",
      )
      .sort({ startDate: 1, createdAt: -1 })
      .populate({
        path: "organizerId",
        select: "businessName approvalStatus userId",
        populate: {
          path: "userId",
          select: "name trustScore verificationStatus",
        },
      })
      .lean();

    if (usePagination) {
      listQuery.skip((page - 1) * limit).limit(limit);
    }

    const trips = await listQuery;
    const mappedTrips = trips.map((trip) => ({
      ...trip,
      organizerId: shapeOrganizer(trip.organizerId),
    }));

    if (usePagination) {
      const total = await Trip.countDocuments(filters);
      return res.status(200).json({
        items: mappedTrips,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    return res.status(200).json(mappedTrips);
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
      startDate,
      endDate,
      pricePerPerson,
      totalSeats,
      availableSeats: totalSeats,
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
    const organizer = await Organizer.findOne({ userId: req.user._id });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
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
      "status",
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] =
          typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      }
    });

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

    const trip = await Trip.findOneAndDelete({ _id: req.params.id, organizerId: organizer._id });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await Promise.all([
      Itinerary.deleteMany({ tripId: trip._id }),
      PickupPoint.deleteMany({ tripId: trip._id }),
      Booking.deleteMany({ tripId: trip._id }),
    ]);

    return res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
};
