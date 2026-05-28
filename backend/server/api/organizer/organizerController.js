const Organizer = require("./organizerModel");
const OrganizerPost = require("./organizerPostModel");
const OrganizerFollow = require("./organizerFollowModel");
const Trip = require("../trip/tripModel");
const Booking = require("../booking/bookingModel");
const User = require("../user/userModel");
const {
  reconcileTripSeatInventory,
  reconcileTripsSeatInventory,
} = require("../trip/tripSeatSyncService");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");
const { recalculateAndPersistTrustScore } = require("../user/trustScoreService");
const { escapeRegex } = require("../../utils/text");
const sanitizeUser = require("../../utils/sanitizeUser");

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
const PRIVATE_USER_FIELDS =
  "-passwordHash -passwordResetTokenHash -passwordResetExpiresAt -emailVerificationTokenHash -emailVerificationExpiresAt";

const getPrimaryOrganizerProfile = (userId) =>
  Organizer.findOne({ userId })
    .sort({ approvalStatus: 1, approvedAt: -1, createdAt: -1 })
    .populate({
      path: "userId",
      select: PRIVATE_USER_FIELDS,
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
    const { businessName, businessDesc, gstNumber, bankAccountDetails } = req.body;

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
      businessDesc: businessDesc ? businessDesc.trim() : "",
      gstNumber: gstNumber ? gstNumber.trim() : undefined,
      licenseUrl,
      bankAccountDetails: bankAccountDetails ? bankAccountDetails.trim() : null,
    });
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { role: "organizer" },
      { returnDocument: "after", runValidators: true },
    ).select(PRIVATE_USER_FIELDS);
    if (req.user) {
      req.user.role = "organizer";
    }
    await recalculateAndPersistTrustScore(req.user._id, {
      userDoc: updatedUser || req.user,
      organizerDoc: organizer,
    });

    return res.status(201).json({
      ...organizer.toObject(),
      user: updatedUser ? sanitizeUser(updatedUser) : undefined,
    });
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
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim().toLowerCase();
    const sortByInput = String(req.query.sortBy || "createdAt").trim().toLowerCase();
    const sortOrderInput = String(req.query.sortOrder || "desc").trim().toLowerCase();

    const filters = { organizerId: organizer._id };
    if (["active", "completed", "cancelled"].includes(status)) {
      filters.status = status;
    }
    if (q) {
      const searchRegex = new RegExp(escapeRegex(q), "i");
      filters.$or = [
        { title: searchRegex },
        { source: searchRegex },
        { destination: searchRegex },
        { transportType: searchRegex },
      ];
    }

    const sortBy = ["createdat", "startdate", "priceperperson", "status"].includes(sortByInput)
      ? sortByInput
      : "createdat";
    const sortFieldMap = {
      createdat: "createdAt",
      startdate: "startDate",
      priceperperson: "pricePerPerson",
      status: "status",
    };
    const sortOrder = sortOrderInput === "asc" ? 1 : -1;

    const trips = await Trip.find(filters)
      .select(
        "title source destination transportType paymentEnabled startedAt startDate endDate pricePerPerson totalSeats availableSeats status images organizerId createdAt",
      )
      .sort({ [sortFieldMap[sortBy]]: sortOrder, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const reconciledTrips = await reconcileTripsSeatInventory(trips);

    const total = await Trip.countDocuments(filters);
    return res.status(200).json({
      items: reconciledTrips,
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

const getMyOrganizerFinance = async (req, res) => {
  try {
    const organizer = await getPrimaryOrganizerProfile(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const tripIds = await Trip.find({ organizerId: organizer._id }).distinct("_id");
    if (!tripIds.length) {
      return res.status(200).json({
        totals: {
          bookingsCount: 0,
          grossPaid: 0,
          pendingPayment: 0,
          refundRequired: 0,
          refunded: 0,
          settlementEstimate: 0,
        },
        counts: {
          paymentStatus: {
            created: 0,
            paid: 0,
            failed: 0,
            refund_required: 0,
            refunded: 0,
          },
          bookingStatus: {
            pending: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
          },
        },
      });
    }

    const [statusBreakdown, amountBreakdown] = await Promise.all([
      Booking.aggregate([
        { $match: { tripId: { $in: tripIds } } },
        {
          $group: {
            _id: null,
            created: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "created"] }, 1, 0] },
            },
            paid: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] },
            },
            refund_required: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "refund_required"] }, 1, 0] },
            },
            refunded: {
              $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
            confirmed: {
              $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            bookingsCount: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        { $match: { tripId: { $in: tripIds } } },
        {
          $group: {
            _id: null,
            grossPaid: {
              $sum: {
                $cond: [
                  { $in: ["$paymentStatus", ["paid", "refund_required", "refunded"]] },
                  "$totalAmount",
                  0,
                ],
              },
            },
            pendingPayment: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "created"] }, "$totalAmount", 0],
              },
            },
            refundRequired: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "refund_required"] }, "$totalAmount", 0],
              },
            },
            refunded: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$totalAmount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const counts = statusBreakdown[0] || {};
    const amounts = amountBreakdown[0] || {};

    const grossPaid = Number(amounts.grossPaid || 0);
    const refunded = Number(amounts.refunded || 0);
    const refundRequired = Number(amounts.refundRequired || 0);

    return res.status(200).json({
      totals: {
        bookingsCount: Number(counts.bookingsCount || 0),
        grossPaid,
        pendingPayment: Number(amounts.pendingPayment || 0),
        refundRequired,
        refunded,
        settlementEstimate: Math.max(0, grossPaid - refunded - refundRequired),
      },
      counts: {
        paymentStatus: {
          created: Number(counts.created || 0),
          paid: Number(counts.paid || 0),
          failed: Number(counts.failed || 0),
          refund_required: Number(counts.refund_required || 0),
          refunded: Number(counts.refunded || 0),
        },
        bookingStatus: {
          pending: Number(counts.pending || 0),
          confirmed: Number(counts.confirmed || 0),
          cancelled: Number(counts.cancelled || 0),
          completed: Number(counts.completed || 0),
        },
      },
    });
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
    const organizer = await Organizer.findOne({ userId: req.user._id })
      .sort({ approvalStatus: 1, approvedAt: -1, createdAt: -1 })
      .select("_id")
      .lean();
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const tripId = String(req.params.tripId || "").trim();
    const status = String(req.query.status || "").trim();

    const trip = await Trip.findOne({ _id: tripId, organizerId: organizer._id })
      .select("_id organizerId")
      .lean();

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    const reconciledTrip = await reconcileTripSeatInventory(trip._id);
    if (!reconciledTrip || String(reconciledTrip.organizerId) !== String(organizer._id)) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const bookingQuery = { tripId: reconciledTrip._id };
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
    const paymentBreakdown = bookings.reduce(
      (acc, booking) => {
        const key = String(booking?.paymentStatus || "");
        if (Object.prototype.hasOwnProperty.call(acc, key)) {
          acc[key] += 1;
        }
        return acc;
      },
      {
        created: 0,
        paid: 0,
        failed: 0,
        refund_required: 0,
        refunded: 0,
      },
    );
    const bookingBreakdown = bookings.reduce(
      (acc, booking) => {
        const key = String(booking?.status || "");
        if (Object.prototype.hasOwnProperty.call(acc, key)) {
          acc[key] += 1;
        }
        return acc;
      },
      {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      },
    );

    return res.status(200).json({
      trip: reconciledTrip,
      summary: {
        seatsBookedTotal,
        seatsFilled: Math.max(0, Number(reconciledTrip.totalSeats || 0) - Number(reconciledTrip.availableSeats || 0)),
        totalSeats: Number(reconciledTrip.totalSeats || 0),
        revenueTotal,
        bookingsCount: bookings.length,
        paymentBreakdown,
        bookingBreakdown,
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
  getMyOrganizerFinance,
  getPublicOrganizerProfileByUserId,
  createOrganizerPost,
  getMyOrganizerPosts,
  deleteMyOrganizerPost,
  followOrganizer,
  unfollowOrganizer,
  getOrganizerFollowStatus,
};
