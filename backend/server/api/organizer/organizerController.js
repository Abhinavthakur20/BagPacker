const Organizer = require("./organizerModel");
const OrganizerPost = require("./organizerPostModel");
const OrganizerFollow = require("./organizerFollowModel");
const Trip = require("../trip/tripModel");
const Booking = require("../booking/bookingModel");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

const DOCUMENT_IMAGE_TRANSFORMATIONS = {
  width: 2000,
  crop: "limit",
  quality: "auto:good",
  fetch_format: "auto",
  dpr: "auto",
};

const ORGANIZER_POST_IMAGE_TRANSFORMATIONS = {
  width: 1800,
  crop: "limit",
  quality: "auto:good",
  fetch_format: "auto",
  dpr: "auto",
};

const ORGANIZER_POST_VIDEO_TRANSFORMATIONS = {
  quality: "auto:good",
  fetch_format: "auto",
};

const getPrimaryOrganizerProfile = (userId) =>
  Organizer.findOne({ userId })
    .sort({ approvalStatus: 1, approvedAt: -1, createdAt: -1 })
    .populate({
      path: "userId",
      select: "-passwordHash",
    });

const getOrganizerEngagement = async (organizerId) => {
  const [followersCount, postsCount] = await Promise.all([
    OrganizerFollow.countDocuments({ organizerId }),
    OrganizerPost.countDocuments({ organizerId }),
  ]);
  return { followersCount, postsCount };
};

const registerOrganizerProfile = async (req, res) => {
  try {
    const { businessName, gstNumber, bankAccountDetails } = req.body;

    const existingOrganizer = await Organizer.findOne({ userId: req.user._id });

    if (existingOrganizer) {
      return res.status(400).json({ message: "Organizer profile already exists" });
    }

    let licenseUrl = null;
    if (req.file) {
      const uploadedLicense = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        folder: "bagpacker/organizer-licenses",
        resourceType: "auto",
        transformations: DOCUMENT_IMAGE_TRANSFORMATIONS,
      });
      licenseUrl = uploadedLicense.secure_url;
    }

    const organizer = await Organizer.create({
      userId: req.user._id,
      businessName: businessName.trim(),
      gstNumber: gstNumber ? gstNumber.trim() : undefined,
      licenseUrl,
      bankAccountDetails: bankAccountDetails ? bankAccountDetails.trim() : null,
    });

    return res.status(201).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerProfile = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    return res.status(200).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerTrips = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const trips = await Trip.find({ organizerId: organizer._id })
      .select(
        "title source destination startDate endDate pricePerPerson totalSeats availableSeats status images organizerId createdAt",
      )
      .sort({ startDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Trip.countDocuments({ organizerId: organizer._id });
    return res.status(200).json({ items: trips, pagination: { page, limit, total } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicOrganizerProfileByUserId = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.params.userId }).populate({
      path: "userId",
      select: "_id name avatarUrl trustScore verificationStatus role",
    });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const [posts, engagement] = await Promise.all([
      OrganizerPost.find({ organizerId: organizer._id }).sort({ createdAt: -1 }).lean(),
      getOrganizerEngagement(organizer._id),
    ]);

    return res.status(200).json({
      organizer: {
        _id: organizer._id,
        businessName: organizer.businessName,
        approvalStatus: organizer.approvalStatus,
        userId: organizer.userId,
        ...engagement,
      },
      posts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createOrganizerPost = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    if (!Array.isArray(req.files) || !req.files.length) {
      return res.status(400).json({ message: "At least one image or video is required" });
    }

    const uploadedMedia = await Promise.all(
      req.files.map(async (file) => {
        const isVideo = String(file.mimetype || "").startsWith("video/");
        const uploaded = await uploadBufferToCloudinary({
          buffer: file.buffer,
          originalname: file.originalname,
          folder: "bagpacker/organizer-posts",
          resourceType: isVideo ? "video" : "image",
          transformations: isVideo
            ? ORGANIZER_POST_VIDEO_TRANSFORMATIONS
            : ORGANIZER_POST_IMAGE_TRANSFORMATIONS,
        });
        return {
          url: uploaded.secure_url,
          mediaType: isVideo ? "video" : "image",
        };
      }),
    );

    const post = await OrganizerPost.create({
      organizerId: organizer._id,
      caption: String(req.body.caption || "").trim(),
      media: uploadedMedia,
    });

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerPosts = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const posts = await OrganizerPost.find({ organizerId: organizer._id }).sort({ createdAt: -1 });
    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteMyOrganizerPost = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const deletedPost = await OrganizerPost.findOneAndDelete({
      _id: req.params.postId,
      organizerId: organizer._id,
    });
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const followOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.organizerId).select("_id userId");
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (String(organizer.userId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    await OrganizerFollow.updateOne(
      { organizerId: organizer._id, followerId: req.user._id },
      { $setOnInsert: { organizerId: organizer._id, followerId: req.user._id } },
      { upsert: true },
    );

    const followersCount = await OrganizerFollow.countDocuments({ organizerId: organizer._id });
    return res.status(200).json({ following: true, followersCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const unfollowOrganizer = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.organizerId).select("_id");
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    await OrganizerFollow.deleteOne({ organizerId: organizer._id, followerId: req.user._id });
    const followersCount = await OrganizerFollow.countDocuments({ organizerId: organizer._id });
    return res.status(200).json({ following: false, followersCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getOrganizerFollowStatus = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.organizerId).select("_id");
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    const [followDoc, followersCount] = await Promise.all([
      OrganizerFollow.findOne({ organizerId: organizer._id, followerId: req.user._id }).select("_id"),
      OrganizerFollow.countDocuments({ organizerId: organizer._id }),
    ]);

    return res.status(200).json({ following: Boolean(followDoc), followersCount });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyTripBookings = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const tripId = String(req.params.tripId || "").trim();
    const status = String(req.query.status || "").trim();

    const trip = await Trip.findOne({ _id: tripId, organizerId: organizer._id })
      .select("title source destination startDate endDate pricePerPerson totalSeats availableSeats status organizerId")
      .lean();

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const bookingQuery = { tripId: trip._id };
    if (status) {
      bookingQuery.status = status;
    }

    const bookings = await Booking.find(bookingQuery)
      .sort({ createdAt: -1 })
      .populate({
        path: "travelerId",
        select: "name email phone avatarUrl verificationStatus trustScore",
      })
      .populate({
        path: "pickupPointId",
        select: "location time",
      })
      .select(
        "travelerId seatsBooked totalAmount currency paymentProvider paymentStatus razorpayPaymentId paymentCapturedAt status createdAt pickupPointId",
      )
      .lean();

    const seatsBookedTotal = bookings.reduce((sum, booking) => sum + Math.max(0, Number(booking?.seatsBooked || 0)), 0);
    const revenueTotal = bookings
      .filter((booking) => booking?.paymentStatus === "paid" && booking?.status === "confirmed")
      .reduce((sum, booking) => sum + Math.max(0, Number(booking?.totalAmount || 0)), 0);

    return res.status(200).json({
      trip,
      summary: {
        seatsBookedTotal,
        seatsFilled: Math.max(0, Number(trip.totalSeats || 0) - Number(trip.availableSeats || 0)),
        totalSeats: Number(trip.totalSeats || 0),
        revenueTotal,
        bookingsCount: bookings.length,
      },
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyOrganizerTrips,
  registerOrganizerProfile,
  getMyOrganizerProfile,
  getMyTripBookings,
  getPublicOrganizerProfileByUserId,
  createOrganizerPost,
  getMyOrganizerPosts,
  deleteMyOrganizerPost,
  followOrganizer,
  unfollowOrganizer,
  getOrganizerFollowStatus,
};
