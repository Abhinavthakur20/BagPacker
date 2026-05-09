const mongoose = require("mongoose");
const CompanionRequest = require("./companionRequestModel");
const PersonalTripPost = require("./personalTripPostModel");
const Notification = require("../notification/notificationModel");
const Booking = require("../booking/bookingModel");
const Trip = require("../trip/tripModel");
const { splitExpense } = require("../../utils/haversine");
const {
  buildChatRoomId,
  escapeRegex,
  getClosenessLabel,
  getDateDifferenceInDays,
  getDateScore,
  getDateWindow,
  getDayRange,
  normalizeGenderPreference,
  normalizeText,
  normalizeVehicleType,
  parseSeatCount,
} = require("./companionUtils");

const DATE_WINDOW_DAYS = 2;

const createPaginationPayload = (items, page, limit, total) => ({
  data: items,
  items,
  page,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
});

const resolveRequestDirection = (request, userId) =>
  String(request?.receiverId) === String(userId) ? "incoming" : "outgoing";

const resolvePostSeatsAvailable = (post) => {
  if (typeof post?.seatsAvailable === "number") {
    return Math.max(0, Number(post.seatsAvailable || 0));
  }

  const maxCompanions = Number(post?.maxCompanions || 0);
  const acceptedCount = Array.isArray(post?.acceptedCompanionIds) ? post.acceptedCompanionIds.length : 0;
  return Math.max(0, maxCompanions - acceptedCount);
};

const parseCoordinate = (value, { min, max }) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

const parsePositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseNonNegativeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

// Nominatim (OpenStreetMap) geocoding — no API key required
const getNominatimGeocodedPoint = async (locationText) => {
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("q", locationText);
  geocodeUrl.searchParams.set("format", "json");
  geocodeUrl.searchParams.set("limit", "1");

  const response = await fetch(geocodeUrl.toString(), {
    headers: {
      // Nominatim usage policy requires a descriptive User-Agent
      "User-Agent": "BagPacker/1.0 (thakurabhinav16160@gmail.com)",
      "Accept-Language": "en",
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with status ${response.status}`);
  }

  const hit = Array.isArray(payload) ? payload[0] : null;
  const latitude = Number(hit?.lat);
  const longitude = Number(hit?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Could not geocode location: ${locationText}`);
  }

  return { latitude, longitude };
};

const resolveRouteCoordinates = async ({
  source,
  destination,
  sourceLatitude,
  sourceLongitude,
  destinationLatitude,
  destinationLongitude,
}) => {
  const hasManualCoordinates =
    [sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude].every(
      (value) => typeof value === "number",
    );

  if (hasManualCoordinates) {
    return {
      sourceLatitude,
      sourceLongitude,
      destinationLatitude,
      destinationLongitude,
    };
  }

  const [sourcePoint, destinationPoint] = await Promise.all([
    getNominatimGeocodedPoint(source),
    getNominatimGeocodedPoint(destination),
  ]);

  return {
    sourceLatitude: sourcePoint.latitude,
    sourceLongitude: sourcePoint.longitude,
    destinationLatitude: destinationPoint.latitude,
    destinationLongitude: destinationPoint.longitude,
  };
};

// OSRM public routing service — no API key required
// Coordinate order for OSRM is longitude,latitude (GeoJSON convention)
const getOSRMDistanceKm = async ({
  sourceLatitude,
  sourceLongitude,
  destinationLatitude,
  destinationLongitude,
}) => {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourceLongitude},${sourceLatitude};${destinationLongitude},${destinationLatitude}?overview=false&steps=false`;

  const response = await fetch(osrmUrl, {
    headers: {
      "User-Agent": "BagPacker/1.0 (thakurabhinav16160@gmail.com)",
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.code !== "Ok") {
    throw new Error(
      payload?.message || `OSRM routing request failed with status ${response.status}`,
    );
  }

  const routeDistanceMeters = Number(payload?.routes?.[0]?.distance);
  if (!Number.isFinite(routeDistanceMeters) || routeDistanceMeters <= 0) {
    throw new Error("OSRM routing did not return a valid route distance");
  }

  return Number((routeDistanceMeters / 1000).toFixed(2));
};

const buildExpenseEstimate = async ({
  sourceLatitude,
  sourceLongitude,
  destinationLatitude,
  destinationLongitude,
  fuelPricePerLitre,
  mileage,
  tollAmount,
  numberOfPassengers,
}) => {
  const hasCoordinates =
    [sourceLatitude, sourceLongitude, destinationLatitude, destinationLongitude].every(
      (value) => typeof value === "number",
    );

  if (!hasCoordinates) {
    return {
      distanceKm: null,
      estimatedFuelCost: null,
      estimatedCostPerPerson: null,
    };
  }

  const distanceKm = await getOSRMDistanceKm({
    sourceLatitude,
    sourceLongitude,
    destinationLatitude,
    destinationLongitude,
  });

  if (typeof fuelPricePerLitre !== "number" || typeof mileage !== "number") {
    return {
      distanceKm,
      estimatedFuelCost: null,
      estimatedCostPerPerson: null,
    };
  }

  const estimatedFuelCost = Number(((distanceKm / mileage) * fuelPricePerLitre).toFixed(2));
  const perPersonFuelCost = splitExpense(distanceKm, fuelPricePerLitre, mileage, numberOfPassengers);
  const perPersonToll = Number((parseNonNegativeNumber(tollAmount, 0) / numberOfPassengers).toFixed(2));

  return {
    distanceKm,
    estimatedFuelCost,
    estimatedCostPerPerson: Number((perPersonFuelCost + perPersonToll).toFixed(2)),
  };
};

const mapBookingMatch = ({ booking, request, selectedDate, userId }) => {
  const traveler = booking?.travelerId;
  const trip = booking?.tripId;
  const dateDiffDays = selectedDate && trip?.startDate
    ? getDateDifferenceInDays(trip.startDate, selectedDate)
    : null;
  const trustScore = Number(traveler?.trustScore || 0);
  const score = Number((50 + getDateScore(dateDiffDays) + trustScore / 10).toFixed(1));

  return {
    userId: traveler?._id,
    name: traveler?.name || "Traveler",
    trustScore,
    verificationStatus: traveler?.verificationStatus || "unverified",
    source: trip?.source || "",
    destination: trip?.destination || "",
    travelDate: trip?.startDate || null,
    score,
    dateDiffDays,
    matchLabel: getClosenessLabel(dateDiffDays),
    request: request
      ? {
          id: request._id,
          status: request.status,
          direction: resolveRequestDirection(request, userId),
          chatRoomId: request.chatRoomId || null,
          seatsRequested: Number(request.seatsRequested || 1),
          genderPreference: request.genderPreference || "Any",
          vehicleType: request.vehicleType || null,
        }
      : null,
  };
};

const executePersonalTripSearch = async (req, res, { legacyArrayResponse = false } = {}) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const usePagination = !legacyArrayResponse || req.query.page !== undefined || req.query.limit !== undefined;
    const source = normalizeText(req.query.source);
    const destination = normalizeText(req.query.destination);
    const date = String(req.query.date || "").trim();
    const seatsRequested = parseSeatCount(req.query.seatsRequested, 1);
    const rawGenderPreference = req.query.genderPreference ?? req.query.gender;
    const hasExplicitGenderPreference = Boolean(String(rawGenderPreference || "").trim());
    const genderPreference = normalizeGenderPreference(rawGenderPreference);
    const rawVehicleType = req.query.vehicleType ?? req.query.vehicle;
    const vehicleType = normalizeVehicleType(rawVehicleType);
    const hasExplicitVehicleType = Boolean(vehicleType);
    const dateWindow = date ? getDateWindow(date, DATE_WINDOW_DAYS) : null;

    if (date && !dateWindow) {
      return res.status(400).json({ message: "Valid date query is required" });
    }

    const requestLookupUserId = req.user._id;
    const basePipeline = [
      {
        $addFields: {
          seatsAvailableResolved: {
            $ifNull: [
              "$seatsAvailable",
              {
                $subtract: [
                  { $ifNull: ["$maxCompanions", 0] },
                  { $size: { $ifNull: ["$acceptedCompanionIds", []] } },
                ],
              },
            ],
          },
          genderPreferenceResolved: { $ifNull: ["$genderPreference", "Any"] },
          vehicleTypeResolved: { $ifNull: ["$vehicleType", null] },
          sourceMatchesQuery: source
            ? {
                $regexMatch: {
                  input: "$source",
                  regex: escapeRegex(source),
                  options: "i",
                },
              }
            : true,
          destinationMatchesQuery: destination
            ? {
                $regexMatch: {
                  input: "$destination",
                  regex: escapeRegex(destination),
                  options: "i",
                },
              }
            : true,
        },
      },
      {
        $match: {
          ownerId: { $ne: req.user._id },
          status: "active",
        },
      },
      {
        $match: {
          seatsAvailableResolved: { $gte: seatsRequested },
        },
      },
      ...(dateWindow
        ? [
            {
              $match: {
                travelDate: { $gte: dateWindow.start, $lte: dateWindow.end },
              },
            },
            {
              $addFields: {
                dateDiffDays: {
                  $abs: {
                    $dateDiff: {
                      startDate: "$travelDate",
                      endDate: dateWindow.selectedDate,
                      unit: "day",
                    },
                  },
                },
              },
            },
          ]
        : [
            {
              $addFields: {
                dateDiffDays: null,
              },
            },
          ]),
      ...(hasExplicitGenderPreference
        ? [
            {
              $match: {
                $or: [
                  { genderPreferenceResolved: "Any" },
                  { genderPreferenceResolved: genderPreference },
                ],
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: "$owner",
      },
      {
        $match: {
          "owner.role": "traveler",
          "owner.verificationStatus": { $ne: "rejected" },
        },
      },
      {
        $lookup: {
          from: "companionrequests",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$requestType", "personal_trip_post"] },
                    { $eq: ["$personalTripPostId", "$$postId"] },
                    {
                      $or: [
                        { $eq: ["$requesterId", requestLookupUserId] },
                        { $eq: ["$receiverId", requestLookupUserId] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "request",
        },
      },
      {
        $addFields: {
          request: { $arrayElemAt: ["$request", 0] },
          routeScore:
            source && destination
              ? {
                  $cond: [
                    { $and: ["$sourceMatchesQuery", "$destinationMatchesQuery"] },
                    50,
                    0,
                  ],
                }
              : source || destination
                ? {
                    $cond: [
                      { $and: ["$sourceMatchesQuery", "$destinationMatchesQuery"] },
                      25,
                      0,
                    ],
                  }
                : 0,
          dateScore: dateWindow
            ? {
                $switch: {
                  branches: [
                    { case: { $eq: ["$dateDiffDays", 0] }, then: 30 },
                    { case: { $eq: ["$dateDiffDays", 1] }, then: 20 },
                    { case: { $eq: ["$dateDiffDays", 2] }, then: 10 },
                  ],
                  default: 0,
                },
              }
            : 0,
          genderScore: hasExplicitGenderPreference
            ? {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$genderPreferenceResolved", "Any"] },
                      { $eq: ["$genderPreferenceResolved", genderPreference] },
                    ],
                  },
                  10,
                  0,
                ],
              }
            : 0,
          vehicleScore: hasExplicitVehicleType
            ? {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$vehicleTypeResolved", vehicleType] },
                      { $eq: ["$vehicleTypeResolved", null] },
                    ],
                  },
                  5,
                  0,
                ],
              }
            : 0,
          trustBoost: {
            $divide: [{ $ifNull: ["$owner.trustScore", 0] }, 10],
          },
        },
      },
      {
        $addFields: {
          score: {
            $add: ["$routeScore", "$dateScore", "$genderScore", "$vehicleScore", "$trustBoost"],
          },
        },
      },
      {
        $sort: {
          score: -1,
          "owner.trustScore": -1,
          travelDate: 1,
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                postId: "$_id",
                ownerId: "$owner._id",
                ownerName: "$owner.name",
                trustScore: { $ifNull: ["$owner.trustScore", 0] },
                verificationStatus: { $ifNull: ["$owner.verificationStatus", "unverified"] },
                source: 1,
                destination: 1,
                sourceLatitude: 1,
                sourceLongitude: 1,
                destinationLatitude: 1,
                destinationLongitude: 1,
                fuelPricePerLitre: 1,
                mileage: 1,
                tollAmount: { $ifNull: ["$tollAmount", 0] },
                distanceKm: 1,
                estimatedFuelCost: 1,
                estimatedCostPerPerson: 1,
                travelDate: 1,
                maxCompanions: { $ifNull: ["$maxCompanions", "$seatsAvailableResolved"] },
                seatsAvailable: "$seatsAvailableResolved",
                note: { $ifNull: ["$note", ""] },
                genderPreference: "$genderPreferenceResolved",
                vehicleType: "$vehicleTypeResolved",
                score: { $round: ["$score", 1] },
                dateDiffDays: 1,
                request: {
                  $cond: [
                    { $ifNull: ["$request._id", false] },
                    {
                      id: "$request._id",
                      status: "$request.status",
                      direction: {
                        $cond: [
                          { $eq: ["$request.receiverId", requestLookupUserId] },
                          "incoming",
                          "outgoing",
                        ],
                      },
                      chatRoomId: { $ifNull: ["$request.chatRoomId", null] },
                      seatsRequested: { $ifNull: ["$request.seatsRequested", 1] },
                      genderPreference: { $ifNull: ["$request.genderPreference", "Any"] },
                      vehicleType: { $ifNull: ["$request.vehicleType", null] },
                    },
                    null,
                  ],
                },
              },
            },
          ],
          metadata: [{ $count: "total" }],
        },
      },
    ];

    const aggregateResult = await PersonalTripPost.aggregate(basePipeline);
    const result = aggregateResult[0] || { data: [], metadata: [] };
    const total = Number(result.metadata?.[0]?.total || 0);
    const items = (result.data || []).map((item) => ({
      ...item,
      matchLabel: getClosenessLabel(item.dateDiffDays),
    }));

    if (!usePagination) {
      return res.status(200).json(items);
    }

    return res.status(200).json(createPaginationPayload(items, page, limit, total));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const findCompanions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const usePagination = req.query.page !== undefined || req.query.limit !== undefined;
    const source = normalizeText(req.query.source);
    const destination = normalizeText(req.query.destination);
    const date = String(req.query.date || "").trim();
    const range = date ? getDayRange(date) : null;
    const selectedDate = range?.start || null;

    if (date && !range) {
      return res.status(400).json({ message: "Valid date query is required" });
    }

    const tripFilters = {
      status: "active",
    };

    if (source) {
      tripFilters.source = { $regex: escapeRegex(source), $options: "i" };
    }

    if (destination) {
      tripFilters.destination = { $regex: escapeRegex(destination), $options: "i" };
    }

    if (range) {
      tripFilters.startDate = { $gte: range.start, $lte: range.end };
    }

    const tripMatchStage = {
      status: tripFilters.status,
      ...(tripFilters.source ? { source: tripFilters.source } : {}),
      ...(tripFilters.destination ? { destination: tripFilters.destination } : {}),
      ...(tripFilters.startDate ? { startDate: tripFilters.startDate } : {}),
    };

    const candidateSnapshots = await Booking.aggregate([
      {
        $match: {
          travelerId: { $ne: new mongoose.Types.ObjectId(req.user._id) },
          status: { $in: ["confirmed", "completed"] },
        },
      },
      {
        $lookup: {
          from: "trips",
          localField: "tripId",
          foreignField: "_id",
          as: "trip",
          pipeline: [
            { $match: tripMatchStage },
            { $project: { _id: 1, source: 1, destination: 1, startDate: 1 } },
          ],
        },
      },
      { $unwind: "$trip" },
      {
        $lookup: {
          from: "users",
          localField: "travelerId",
          foreignField: "_id",
          as: "traveler",
          pipeline: [{ $project: { name: 1, trustScore: 1, verificationStatus: 1, role: 1 } }],
        },
      },
      { $unwind: "$traveler" },
      {
        $match: {
          "traveler.role": "traveler",
          "traveler.verificationStatus": { $ne: "rejected" },
        },
      },
      {
        $addFields: {
          dateDistanceScore: selectedDate
            ? { $abs: { $subtract: ["$trip.startDate", selectedDate] } }
            : 0,
          candidateScore: {
            $subtract: [
              selectedDate ? { $abs: { $subtract: ["$trip.startDate", selectedDate] } } : 0,
              { $multiply: [{ $ifNull: ["$traveler.trustScore", 0] }, 60 * 1000] },
            ],
          },
        },
      },
      { $sort: { candidateScore: 1, createdAt: -1 } },
      {
        $group: {
          _id: "$travelerId",
          booking: { $first: "$$ROOT" },
          score: { $first: "$candidateScore" },
        },
      },
      {
        $project: {
          _id: 0,
          travelerId: "$booking.travelerId",
          traveler: "$booking.traveler",
          trip: "$booking.trip",
        },
      },
    ]);

    const candidatesByUser = new Map(
      candidateSnapshots.map((item) => [
        String(item.travelerId),
        {
          booking: {
            travelerId: item.traveler,
            tripId: item.trip,
          },
        },
      ]),
    );

    const candidateUserIds = candidateSnapshots.map((item) => String(item.travelerId));
    if (!candidateUserIds.length) {
      if (!usePagination) {
        return res.status(200).json([]);
      }

      return res.status(200).json(createPaginationPayload([], page, limit, 0));
    }

    const requestFilters = {
      $or: [
        { requesterId: req.user._id, receiverId: { $in: candidateUserIds } },
        { receiverId: req.user._id, requesterId: { $in: candidateUserIds } },
      ],
    };

    if (source) {
      requestFilters.source = { $regex: `^${escapeRegex(source)}$`, $options: "i" };
    }

    if (destination) {
      requestFilters.destination = { $regex: `^${escapeRegex(destination)}$`, $options: "i" };
    }

    if (range) {
      requestFilters.travelDate = { $gte: range.start, $lte: range.end };
    }

    const companionRequests = await CompanionRequest.find(requestFilters)
      .sort({ createdAt: -1 })
      .lean();
    const latestRequestByUser = new Map();

    for (const request of companionRequests) {
      const counterpartId =
        String(request.requesterId) === String(req.user._id)
          ? String(request.receiverId)
          : String(request.requesterId);

      if (!latestRequestByUser.has(counterpartId)) {
        latestRequestByUser.set(counterpartId, request);
      }
    }

    const results = candidateUserIds
      .map((candidateUserId) =>
        mapBookingMatch({
          booking: candidatesByUser.get(candidateUserId)?.booking,
          request: latestRequestByUser.get(candidateUserId) || null,
          selectedDate,
          userId: req.user._id,
        }),
      )
      .filter((item) => item.userId);

    const requestPriority = (item) => {
      if (!item.request) {
        return 1;
      }
      if (item.request.status === "pending" && item.request.direction === "incoming") {
        return 0;
      }
      if (item.request.status === "pending" && item.request.direction === "outgoing") {
        return 2;
      }
      if (item.request.status === "accepted") {
        return 3;
      }
      return 4;
    };

    results.sort((first, second) => {
      const firstPriority = requestPriority(first);
      const secondPriority = requestPriority(second);
      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      const scoreDelta = Number(second.score || 0) - Number(first.score || 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const firstTime = first.travelDate ? new Date(first.travelDate).getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = second.travelDate
        ? new Date(second.travelDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime;
    });

    const total = results.length;
    if (!usePagination) {
      return res.status(200).json(results.slice(0, 100));
    }

    return res.status(200).json(createPaginationPayload(results.slice(skip, skip + limit), page, limit, total));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendCompanionRequest = async (req, res) => {
  try {
    const { receiverId, source, destination, travelDate } = req.body;
    const normalizedSource = normalizeText(source);
    const normalizedDestination = normalizeText(destination);
    const range = getDayRange(travelDate);
    const seatsRequested = parseSeatCount(req.body.seatsRequested, 1);
    const genderPreference = normalizeGenderPreference(req.body.genderPreference);
    const vehicleType = normalizeVehicleType(req.body.vehicleType);

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    if (String(receiverId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot send a companion request to yourself" });
    }

    if (!normalizedSource || !normalizedDestination) {
      return res.status(400).json({ message: "Source and destination are required" });
    }

    if (!range) {
      return res.status(400).json({ message: "Valid travelDate is required" });
    }

    const existingRequest = await CompanionRequest.findOne({
      requesterId: req.user._id,
      receiverId,
      requestType: "booking_match",
      source: { $regex: `^${escapeRegex(normalizedSource)}$`, $options: "i" },
      destination: { $regex: `^${escapeRegex(normalizedDestination)}$`, $options: "i" },
      status: "pending",
      travelDate: { $gte: range.start, $lte: range.end },
    });

    if (existingRequest) {
      return res.status(400).json({ message: "A pending companion request already exists" });
    }

    const request = await CompanionRequest.create({
      requesterId: req.user._id,
      receiverId,
      source: normalizedSource,
      destination: normalizedDestination,
      travelDate: range.start,
      seatsRequested,
      genderPreference,
      vehicleType,
      requestType: "booking_match",
    });

    await Notification.create({
      userId: receiverId,
      type: "companion_request",
      message: `${req.user.name} sent you a companion request.`,
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createPersonalTripPost = async (req, res) => {
  try {
    const source = normalizeText(req.body.source);
    const destination = normalizeText(req.body.destination);
    const range = getDayRange(req.body.travelDate);
    const maxCompanions = parseSeatCount(req.body.seatsAvailable ?? req.body.maxCompanions, 0);
    const note = String(req.body.note || "").trim();
    const genderPreference = normalizeGenderPreference(req.body.genderPreference);
    const vehicleType = normalizeVehicleType(req.body.vehicleType);
    const sourceLatitude = parseCoordinate(req.body.sourceLatitude, { min: -90, max: 90 });
    const sourceLongitude = parseCoordinate(req.body.sourceLongitude, { min: -180, max: 180 });
    const destinationLatitude = parseCoordinate(req.body.destinationLatitude, { min: -90, max: 90 });
    const destinationLongitude = parseCoordinate(req.body.destinationLongitude, { min: -180, max: 180 });
    const fuelPricePerLitre = parsePositiveNumber(req.body.fuelPricePerLitre);
    const mileage = parsePositiveNumber(req.body.mileage);
    const tollAmount = parseNonNegativeNumber(req.body.tollAmount, 0);

    if (!source || !destination) {
      return res.status(400).json({ message: "Source and destination are required" });
    }

    if (!range) {
      return res.status(400).json({ message: "Valid travelDate is required" });
    }

    if (maxCompanions < 1) {
      return res.status(400).json({ message: "seatsAvailable must be at least 1" });
    }

    const hasAnyExpenseInput = [
      req.body.fuelPricePerLitre,
      req.body.mileage,
      req.body.tollAmount,
    ].some((value) => value !== undefined && value !== null && value !== "");

    if (hasAnyExpenseInput && (fuelPricePerLitre === null || mileage === null)) {
      return res.status(400).json({
        message: "fuelPricePerLitre and mileage must be positive numbers when expense fields are provided",
      });
    }

    const resolvedCoordinates = await resolveRouteCoordinates({
      source,
      destination,
      sourceLatitude,
      sourceLongitude,
      destinationLatitude,
      destinationLongitude,
    });

    const expenseEstimate = await buildExpenseEstimate({
      sourceLatitude: resolvedCoordinates.sourceLatitude,
      sourceLongitude: resolvedCoordinates.sourceLongitude,
      destinationLatitude: resolvedCoordinates.destinationLatitude,
      destinationLongitude: resolvedCoordinates.destinationLongitude,
      fuelPricePerLitre,
      mileage,
      tollAmount,
      numberOfPassengers: maxCompanions + 1,
    });

    const post = await PersonalTripPost.create({
      ownerId: req.user._id,
      source,
      destination,
      sourceLatitude: resolvedCoordinates.sourceLatitude,
      sourceLongitude: resolvedCoordinates.sourceLongitude,
      destinationLatitude: resolvedCoordinates.destinationLatitude,
      destinationLongitude: resolvedCoordinates.destinationLongitude,
      fuelPricePerLitre,
      mileage,
      tollAmount,
      distanceKm: expenseEstimate.distanceKm,
      estimatedFuelCost: expenseEstimate.estimatedFuelCost,
      estimatedCostPerPerson: expenseEstimate.estimatedCostPerPerson,
      travelDate: range.start,
      maxCompanions,
      seatsAvailable: maxCompanions,
      note,
      genderPreference,
      vehicleType,
    });

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listPersonalTripPosts = async (req, res) => executePersonalTripSearch(req, res, { legacyArrayResponse: true });

const searchPersonalTripPosts = async (req, res) => executePersonalTripSearch(req, res, { legacyArrayResponse: false });

const requestPersonalTripPost = async (req, res) => {
  try {
    const postId = req.body.personalTripPostId || req.body.postId;
    const seatsRequested = parseSeatCount(req.body.seatsRequested, 1);
    const genderPreference = normalizeGenderPreference(req.body.genderPreference);
    const requestedVehicleType = normalizeVehicleType(req.body.vehicleType);

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const post = await PersonalTripPost.findById(postId).select(
      "ownerId source destination travelDate maxCompanions seatsAvailable acceptedCompanionIds status genderPreference vehicleType",
    );

    if (!post || post.status !== "active") {
      return res.status(404).json({ message: "Personal trip post not found" });
    }

    if (String(post.ownerId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot request your own post" });
    }

    const seatsAvailable = resolvePostSeatsAvailable(post);
    if (seatsRequested > seatsAvailable) {
      return res.status(400).json({ message: "Not enough seats are available on this post" });
    }

    const duplicateRequest = await CompanionRequest.findOne({
      requestType: "personal_trip_post",
      personalTripPostId: post._id,
      requesterId: req.user._id,
      receiverId: post.ownerId,
      status: "pending",
    });

    if (duplicateRequest) {
      return res.status(400).json({ message: "A pending request already exists for this post" });
    }

    const request = await CompanionRequest.create({
      requesterId: req.user._id,
      receiverId: post.ownerId,
      source: post.source,
      destination: post.destination,
      travelDate: post.travelDate,
      seatsRequested,
      genderPreference,
      vehicleType: requestedVehicleType || post.vehicleType || null,
      requestType: "personal_trip_post",
      personalTripPostId: post._id,
    });

    await Notification.create({
      userId: post.ownerId,
      type: "companion_request",
      message: `${req.user.name} requested to join your personal trip post.`,
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createCompanionRequest = async (req, res) => {
  if (req.body.personalTripPostId || req.body.postId) {
    return requestPersonalTripPost(req, res);
  }

  return sendCompanionRequest(req, res);
};

const respondToCompanionRequest = async (req, res, forcedStatus = null) => {
  try {
    const status = forcedStatus || req.body.status;
    const request = await CompanionRequest.findOne({
      _id: req.params.id,
      receiverId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({ message: "Companion request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "This companion request has already been handled" });
    }

    if (status === "accepted" && request.requestType === "personal_trip_post" && request.personalTripPostId) {
      const currentPost = await PersonalTripPost.findById(request.personalTripPostId).select(
        "ownerId status seatsAvailable maxCompanions acceptedCompanionIds",
      );

      if (!currentPost || String(currentPost.ownerId) !== String(req.user._id)) {
        return res.status(404).json({ message: "Related personal trip post not found" });
      }

      if (currentPost.status !== "active") {
        return res.status(400).json({ message: "This personal trip post is not active" });
      }

      const seatsAvailable = resolvePostSeatsAvailable(currentPost);
      if (typeof currentPost.seatsAvailable !== "number") {
        await PersonalTripPost.updateOne(
          { _id: currentPost._id, seatsAvailable: { $exists: false } },
          { $set: { seatsAvailable } },
        );
      }

      const seatsRequested = parseSeatCount(request.seatsRequested, 1);
      const updatedPost = await PersonalTripPost.findOneAndUpdate(
        {
          _id: request.personalTripPostId,
          ownerId: req.user._id,
          status: "active",
          seatsAvailable: { $gte: seatsRequested },
          acceptedCompanionIds: { $ne: request.requesterId },
        },
        {
          $inc: { seatsAvailable: -seatsRequested },
          $addToSet: { acceptedCompanionIds: request.requesterId },
        },
        { new: true },
      );

      if (!updatedPost) {
        return res.status(400).json({ message: "Not enough seats remain for this request" });
      }

      if (Number(updatedPost.seatsAvailable || 0) <= 0 && updatedPost.status !== "closed") {
        await PersonalTripPost.updateOne(
          { _id: updatedPost._id, status: "active" },
          { $set: { status: "closed" } },
        );
      }
    }

    request.status = status;
    if (status === "accepted") {
      request.chatRoomId = buildChatRoomId(request.requesterId, request.receiverId);
    }

    await request.save();

    await Notification.create({
      userId: request.requesterId,
      type: "companion_request",
      message: `${req.user.name} ${status} your companion request.`,
    });

    return res.status(200).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const acceptCompanionRequest = async (req, res) => respondToCompanionRequest(req, res, "accepted");

const declineCompanionRequest = async (req, res) => respondToCompanionRequest(req, res, "declined");

const getMyCompanionRequests = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const [sent, received, sentTotal, receivedTotal] = await Promise.all([
      CompanionRequest.find({ requesterId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role")
        .populate(
          "personalTripPostId",
          "source destination sourceLatitude sourceLongitude destinationLatitude destinationLongitude fuelPricePerLitre mileage tollAmount distanceKm estimatedFuelCost estimatedCostPerPerson travelDate maxCompanions seatsAvailable note status genderPreference vehicleType",
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      CompanionRequest.find({ receiverId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role")
        .populate(
          "personalTripPostId",
          "source destination sourceLatitude sourceLongitude destinationLatitude destinationLongitude fuelPricePerLitre mileage tollAmount distanceKm estimatedFuelCost estimatedCostPerPerson travelDate maxCompanions seatsAvailable note status genderPreference vehicleType",
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      CompanionRequest.countDocuments({ requesterId: req.user._id }),
      CompanionRequest.countDocuments({ receiverId: req.user._id }),
    ]);

    return res.status(200).json({
      sent,
      received,
      pagination: {
        page,
        limit,
        sentTotal,
        receivedTotal,
        sentTotalPages: Math.max(1, Math.ceil(sentTotal / limit)),
        receivedTotalPages: Math.max(1, Math.ceil(receivedTotal / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUserCompanionRequests = async (req, res) => {
  if (String(req.params.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: "You can only view your own companion requests" });
  }

  return getMyCompanionRequests(req, res);
};

const getMyPersonalTripPosts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      PersonalTripPost.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PersonalTripPost.countDocuments({ ownerId: req.user._id }),
    ]);

    const payload = posts.map((post) => ({
      ...post,
      seatsAvailable: resolvePostSeatsAvailable(post),
    }));

    return res.status(200).json({
      items: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  acceptCompanionRequest,
  createCompanionRequest,
  createPersonalTripPost,
  declineCompanionRequest,
  findCompanions,
  getMyCompanionRequests,
  getMyPersonalTripPosts,
  getUserCompanionRequests,
  listPersonalTripPosts,
  requestPersonalTripPost,
  respondToCompanionRequest,
  searchPersonalTripPosts,
  sendCompanionRequest,
};
