const CompanionRequest = require("./companionRequestModel");
const Notification = require("../notification/notificationModel");
const Booking = require("../booking/bookingModel");
const Trip = require("../trip/tripModel");

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

const buildChatRoomId = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join("_");

const findCompanions = async (req, res) => {
  try {
    const source = String(req.query.source || "").trim();
    const destination = String(req.query.destination || "").trim();
    const date = String(req.query.date || "").trim();
    const range = date ? getDayRange(date) : null;

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

    const trips = await Trip.find(tripFilters).select("_id source destination startDate");

    if (!trips.length) {
      return res.status(200).json([]);
    }

    const tripIds = trips.map((trip) => trip._id);
    const candidateBookings = await Booking.find({
      tripId: { $in: tripIds },
      travelerId: { $ne: req.user._id },
      status: { $in: ["confirmed", "completed"] },
    })
      .sort({ createdAt: -1 })
      .populate("travelerId", "name trustScore verificationStatus role")
      .populate("tripId", "source destination startDate");

    const candidatesByUser = new Map();

    for (const booking of candidateBookings) {
      const traveler = booking.travelerId;
      if (!traveler || traveler.role !== "traveler") {
        continue;
      }

      const travelerId = String(traveler._id);
      if (!candidatesByUser.has(travelerId)) {
        candidatesByUser.set(travelerId, booking);
      }
    }

    const candidateUserIds = [...candidatesByUser.keys()];

    if (!candidateUserIds.length) {
      return res.status(200).json([]);
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

    const companionRequests = await CompanionRequest.find(requestFilters).sort({
      createdAt: -1,
    });
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
      .map((candidateUserId) => {
        const booking = candidatesByUser.get(candidateUserId);
        const traveler = booking?.travelerId;
        const trip = booking?.tripId;
        const request = latestRequestByUser.get(candidateUserId) || null;

        return {
          userId: traveler?._id,
          name: traveler?.name || "Traveler",
          trustScore: traveler?.trustScore || 0,
          verificationStatus: traveler?.verificationStatus || "pending",
          source: trip?.source || source,
          destination: trip?.destination || destination,
          travelDate: trip?.startDate || (range ? range.start : null),
          request: request
            ? {
                id: request._id,
                status: request.status,
                direction:
                  String(request.receiverId) === String(req.user._id) ? "incoming" : "outgoing",
                chatRoomId: request.chatRoomId || null,
              }
            : null,
        };
      })
      .filter((item) => item.userId);

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendCompanionRequest = async (req, res) => {
  try {
    const { receiverId, source, destination, travelDate, vehicleType } = req.body;

    if (String(receiverId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot send a companion request to yourself" });
    }

    const range = getDayRange(travelDate);
    const duplicateFilter = {
      requesterId: req.user._id,
      receiverId,
      source: source.trim(),
      destination: destination.trim(),
      status: "pending",
    };

    if (range) {
      duplicateFilter.travelDate = { $gte: range.start, $lte: range.end };
    }

    const existingRequest = await CompanionRequest.findOne(duplicateFilter);

    if (existingRequest) {
      return res.status(400).json({ message: "A pending companion request already exists" });
    }

    const request = await CompanionRequest.create({
      requesterId: req.user._id,
      receiverId,
      source: source.trim(),
      destination: destination.trim(),
      travelDate,
      vehicleType: vehicleType || null,
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

const respondToCompanionRequest = async (req, res) => {
  try {
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

    request.status = req.body.status;
    if (req.body.status === "accepted") {
      request.chatRoomId = buildChatRoomId(request.requesterId, request.receiverId);
    }

    await request.save();

    await Notification.create({
      userId: request.requesterId,
      type: "companion_request",
      message: `${req.user.name} ${req.body.status} your companion request.`,
    });

    return res.status(200).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyCompanionRequests = async (req, res) => {
  try {
    const [sent, received] = await Promise.all([
      CompanionRequest.find({ requesterId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role"),
      CompanionRequest.find({ receiverId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role"),
    ]);

    return res.status(200).json({ sent, received });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  findCompanions,
  sendCompanionRequest,
  respondToCompanionRequest,
  getMyCompanionRequests,
};
