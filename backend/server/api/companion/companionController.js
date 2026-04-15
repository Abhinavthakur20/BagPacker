const CompanionRequest = require("./companionRequestModel");
const PersonalTripPost = require("./personalTripPostModel");
const Notification = require("../notification/notificationModel");
const Booking = require("../booking/bookingModel");
const Trip = require("../trip/tripModel");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeText = (value = "") => String(value || "").trim().replace(/\s+/g, " ");

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
    const source = normalizeText(req.query.source);
    const destination = normalizeText(req.query.destination);
    const date = String(req.query.date || "").trim();
    const range = date ? getDayRange(date) : null;
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

    const trips = await Trip.find(tripFilters).select("_id source destination startDate").lean();

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
      .populate("tripId", "source destination startDate")
      .lean();

    const candidatesByUser = new Map();

    for (const booking of candidateBookings) {
      const traveler = booking.travelerId;
      if (!traveler || traveler.role !== "traveler" || traveler.verificationStatus === "rejected") {
        continue;
      }

      const travelerId = String(traveler._id);
      const tripStartDate = booking?.tripId?.startDate ? new Date(booking.tripId.startDate) : null;
      const dateDistanceScore =
        range && tripStartDate ? Math.abs(tripStartDate.getTime() - range.start.getTime()) : 0;
      const trustScore = Number(traveler.trustScore || 0);

      const candidateScore = dateDistanceScore - trustScore * 60 * 1000;
      const existing = candidatesByUser.get(travelerId);
      if (!existing || candidateScore < existing.score) {
        candidatesByUser.set(travelerId, { booking, score: candidateScore });
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

    const companionRequests = await CompanionRequest.find(requestFilters)
      .sort({
        createdAt: -1,
      })
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
      .map((candidateUserId) => {
        const booking = candidatesByUser.get(candidateUserId)?.booking;
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

      const trustDelta = Number(second.trustScore || 0) - Number(first.trustScore || 0);
      if (trustDelta !== 0) {
        return trustDelta;
      }

      const firstTime = first.travelDate ? new Date(first.travelDate).getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = second.travelDate
        ? new Date(second.travelDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime;
    });

    return res.status(200).json(results.slice(0, 100));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const sendCompanionRequest = async (req, res) => {
  try {
    const { receiverId, source, destination, travelDate, vehicleType } = req.body;
    const normalizedSource = normalizeText(source);
    const normalizedDestination = normalizeText(destination);

    if (String(receiverId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot send a companion request to yourself" });
    }

    const range = getDayRange(travelDate);
    if (!range) {
      return res.status(400).json({ message: "Valid travelDate is required" });
    }
    const duplicateFilter = {
      requesterId: req.user._id,
      receiverId,
      source: { $regex: `^${escapeRegex(normalizedSource)}$`, $options: "i" },
      destination: { $regex: `^${escapeRegex(normalizedDestination)}$`, $options: "i" },
      status: "pending",
    };

    duplicateFilter.travelDate = { $gte: range.start, $lte: range.end };

    const existingRequest = await CompanionRequest.findOne(duplicateFilter);

    if (existingRequest) {
      return res.status(400).json({ message: "A pending companion request already exists" });
    }

    const request = await CompanionRequest.create({
      requesterId: req.user._id,
      receiverId,
      source: normalizedSource,
      destination: normalizedDestination,
      travelDate,
      vehicleType: vehicleType || null,
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
    const maxCompanions = Number(req.body.maxCompanions);
    const note = String(req.body.note || "").trim();

    if (!range) {
      return res.status(400).json({ message: "Valid travelDate is required" });
    }

    if (![2, 3].includes(maxCompanions)) {
      return res.status(400).json({ message: "maxCompanions must be 2 or 3" });
    }

    const post = await PersonalTripPost.create({
      ownerId: req.user._id,
      source,
      destination,
      travelDate: range.start,
      maxCompanions,
      note,
    });

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listPersonalTripPosts = async (req, res) => {
  try {
    const source = normalizeText(req.query.source);
    const destination = normalizeText(req.query.destination);
    const date = String(req.query.date || "").trim();
    const range = date ? getDayRange(date) : null;
    if (date && !range) {
      return res.status(400).json({ message: "Valid date query is required" });
    }

    const filters = {
      ownerId: { $ne: req.user._id },
      status: "active",
    };

    if (source) {
      filters.source = { $regex: escapeRegex(source), $options: "i" };
    }

    if (destination) {
      filters.destination = { $regex: escapeRegex(destination), $options: "i" };
    }

    if (range) {
      filters.travelDate = { $gte: range.start, $lte: range.end };
    }

    const posts = await PersonalTripPost.find(filters)
      .sort({ createdAt: -1 })
      .populate("ownerId", "name trustScore verificationStatus role")
      .lean();

    if (!posts.length) {
      return res.status(200).json([]);
    }

    const postIds = posts.map((post) => post._id);
    const existingRequests = await CompanionRequest.find({
      requestType: "personal_trip_post",
      personalTripPostId: { $in: postIds },
      $or: [
        { requesterId: req.user._id },
        { receiverId: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestRequestByPostId = new Map();
    for (const request of existingRequests) {
      const key = String(request.personalTripPostId);
      if (!latestRequestByPostId.has(key)) {
        latestRequestByPostId.set(key, request);
      }
    }

    const results = posts
      .map((post) => {
        const owner = post.ownerId;
        if (!owner || owner.role !== "traveler" || owner.verificationStatus === "rejected") {
          return null;
        }

        const acceptedCount = Array.isArray(post.acceptedCompanionIds)
          ? post.acceptedCompanionIds.length
          : 0;
        const request = latestRequestByPostId.get(String(post._id)) || null;

        return {
          postId: post._id,
          ownerId: owner._id,
          ownerName: owner.name || "Traveler",
          trustScore: owner.trustScore || 0,
          verificationStatus: owner.verificationStatus || "pending",
          source: post.source,
          destination: post.destination,
          travelDate: post.travelDate,
          maxCompanions: post.maxCompanions,
          acceptedCount,
          seatsLeft: Math.max(0, Number(post.maxCompanions || 0) - acceptedCount),
          note: post.note || "",
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
      .filter(Boolean);

    return res.status(200).json(results.slice(0, 100));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const requestPersonalTripPost = async (req, res) => {
  try {
    const post = await PersonalTripPost.findById(req.body.postId).select(
      "ownerId source destination travelDate maxCompanions acceptedCompanionIds status",
    );

    if (!post || post.status !== "active") {
      return res.status(404).json({ message: "Personal trip post not found" });
    }

    if (String(post.ownerId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot request your own post" });
    }

    const acceptedCount = Array.isArray(post.acceptedCompanionIds)
      ? post.acceptedCompanionIds.length
      : 0;
    if (acceptedCount >= Number(post.maxCompanions || 0)) {
      return res.status(400).json({ message: "This post is already full" });
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
      vehicleType: null,
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
      if (
        request.requestType === "personal_trip_post" &&
        request.personalTripPostId
      ) {
        const post = await PersonalTripPost.findById(request.personalTripPostId).select(
          "ownerId maxCompanions acceptedCompanionIds status",
        );
        if (!post || String(post.ownerId) !== String(req.user._id)) {
          return res.status(404).json({ message: "Related personal trip post not found" });
        }
        if (post.status !== "active") {
          return res.status(400).json({ message: "This personal trip post is not active" });
        }

        const acceptedCompanionIds = Array.isArray(post.acceptedCompanionIds)
          ? post.acceptedCompanionIds.map((item) => String(item))
          : [];
        if (acceptedCompanionIds.length >= Number(post.maxCompanions || 0)) {
          return res.status(400).json({ message: "This personal trip post is already full" });
        }

        const requesterId = String(request.requesterId);
        if (!acceptedCompanionIds.includes(requesterId)) {
          post.acceptedCompanionIds.push(request.requesterId);
        }
        if (post.acceptedCompanionIds.length >= Number(post.maxCompanions || 0)) {
          post.status = "closed";
        }
        await post.save();
      }
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
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role")
        .populate("personalTripPostId", "source destination travelDate maxCompanions note status"),
      CompanionRequest.find({ receiverId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("requesterId receiverId", "name email phone trustScore verificationStatus role")
        .populate("personalTripPostId", "source destination travelDate maxCompanions note status"),
    ]);

    return res.status(200).json({ sent, received });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyPersonalTripPosts = async (req, res) => {
  try {
    const posts = await PersonalTripPost.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  findCompanions,
  sendCompanionRequest,
  createPersonalTripPost,
  listPersonalTripPosts,
  requestPersonalTripPost,
  respondToCompanionRequest,
  getMyCompanionRequests,
  getMyPersonalTripPosts,
};
