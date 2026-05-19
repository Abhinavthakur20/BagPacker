const Notification = require("../notification/notificationModel");
const Organizer = require("../organizer/organizerModel");
const Report = require("../report/reportModel");
const Trip = require("../trip/tripModel");
const Booking = require("../booking/bookingModel");
const CompanionRequest = require("../companion/companionRequestModel");
const Review = require("../review/reviewModel");
const User = require("../user/userModel");
const { recalculateAndPersistTrustScore } = require("../user/trustScoreService");

const PRIVATE_USER_FIELDS =
  "-passwordHash -passwordResetTokenHash -passwordResetExpiresAt -emailVerificationTokenHash -emailVerificationExpiresAt";

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select(PRIVATE_USER_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return res.status(200).json({
      items: users,
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

const getPendingOrganizers = async (_req, res) => {
  try {
    const organizers = await Organizer.find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .populate("userId", PRIVATE_USER_FIELDS);

    return res.status(200).json(organizers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewOrganizerApproval = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).populate("userId", "name");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    organizer.approvalStatus = req.body.approvalStatus;
    organizer.approvedAt = req.body.approvalStatus === "approved" ? new Date() : null;
    await organizer.save();
    await recalculateAndPersistTrustScore(organizer.userId._id, { organizerDoc: organizer });

    await Notification.create({
      userId: organizer.userId._id,
      type: "approval_status",
      message: `Your organizer profile has been ${req.body.approvalStatus}.`,
    });

    return res.status(200).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPendingVerifications = async (_req, res) => {
  try {
    const users = await User.find({
      verificationStatus: "pending",
      governmentIdUrl: { $nin: [null, ""] },
    })
      .select(PRIVATE_USER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateVerificationStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: req.body.verificationStatus },
      { returnDocument: "after", runValidators: true },
    ).select(PRIVATE_USER_FIELDS);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
    if (trustResult) {
      user.trustScore = trustResult.trustScore;
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReports = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.status) {
      query.status = String(req.query.status).trim();
    }

    const [reports, total, statusSummary] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reportedBy", "name email")
        .populate("reportedUserId", "name email"),
      Report.countDocuments(query),
      Report.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = statusSummary.reduce(
      (acc, item) => {
        const status = String(item?._id || "unknown");
        acc.byStatus[status] = Number(item?.count || 0);
        if (status !== "resolved") {
          acc.open += Number(item?.count || 0);
        }
        return acc;
      },
      { byStatus: {}, open: 0 },
    );

    return res.status(200).json({
      items: reports,
      summary,
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

const resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = "resolved";
    report.adminAction = req.body.adminAction;
    await report.save();

    if (req.body.adminAction === "ban") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isBanned: true,
      });
    }

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTripListings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.status) {
      query.status = String(req.query.status).trim();
    }
    if (req.query.paymentEnabled !== undefined) {
      query.paymentEnabled = String(req.query.paymentEnabled).trim().toLowerCase() === "true";
    }
    if (req.query.transportType) {
      query.transportType = String(req.query.transportType).trim();
    }

    const [items, total] = await Promise.all([
      Trip.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "organizerId",
          select: "businessName userId approvalStatus",
          populate: { path: "userId", select: "name email" },
        }),
      Trip.countDocuments(query),
    ]);

    return res.status(200).json({
      items,
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

const updateTripLifecycle = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const action = String(req.body.action || "").trim();
    if (action === "start") {
      if (trip.status !== "active") {
        return res.status(400).json({ message: "Only active trips can be started" });
      }
      if (!trip.startedAt) {
        trip.startedAt = new Date();
      }
    } else if (action === "complete") {
      trip.status = "completed";
    } else if (action === "cancel") {
      trip.status = "cancelled";
    } else if (action === "activate") {
      trip.status = "active";
    }

    await trip.save();
    return res.status(200).json(trip);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPaymentMonitor = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;
    const query = {};

    if (req.query.paymentStatus) {
      query.paymentStatus = String(req.query.paymentStatus).trim();
    }
    if (req.query.status) {
      query.status = String(req.query.status).trim();
    }

    const [items, total, summaryRaw] = await Promise.all([
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "travelerId",
          select: "name email phone",
        })
        .populate({
          path: "tripId",
          select: "title source destination startDate endDate status organizerId",
          populate: { path: "organizerId", select: "businessName" },
        })
        .populate("pickupPointId", "location time"),
      Booking.countDocuments(query),
      Booking.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$paymentStatus",
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryRaw.reduce((acc, item) => {
      acc[String(item._id || "unknown")] = {
        count: Number(item.count || 0),
        totalAmount: Number(item.totalAmount || 0),
      };
      return acc;
    }, {});

    return res.status(200).json({
      items,
      summary,
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

const getJoinActivity = async (req, res) => {
  try {
    const [recentRequests, bookingSummary] = await Promise.all([
      CompanionRequest.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("requesterId", "name email")
        .populate("receiverId", "name email"),
      Booking.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const bookingStatusSummary = bookingSummary.reduce((acc, item) => {
      acc[String(item._id || "unknown")] = Number(item.count || 0);
      return acc;
    }, {});

    return res.status(200).json({
      companionRequests: recentRequests,
      bookingStatusSummary,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReviewsOverview = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const [items, total, ratingSummary] = await Promise.all([
      Review.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewerId", "name email")
        .populate("revieweeId", "name email")
        .populate({
          path: "bookingId",
          select: "status tripId",
          populate: { path: "tripId", select: "title source destination" },
        }),
      Review.countDocuments(),
      Review.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      items,
      summary: ratingSummary[0]
        ? {
            averageRating: Number(ratingSummary[0].averageRating || 0),
            totalReviews: Number(ratingSummary[0].totalReviews || 0),
          }
        : { averageRating: 0, totalReviews: 0 },
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

const toggleUserBan = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    return res.status(200).json({
      message: `User ${user.isBanned ? "banned" : "unbanned"} successfully`,
      isBanned: user.isBanned,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const recalculateAllTrustScores = async (_req, res) => {
  try {
    const users = await User.find().select("_id").lean();
    let updated = 0;
    const failures = [];

    for (const user of users) {
      try {
        const trustResult = await recalculateAndPersistTrustScore(user._id);
        if (trustResult) {
          updated += 1;
        }
      } catch (error) {
        failures.push({
          userId: String(user._id),
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      message: "Trust score backfill completed",
      totalUsers: users.length,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 25),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getPendingOrganizers,
  reviewOrganizerApproval,
  getPendingVerifications,
  updateVerificationStatus,
  getReports,
  resolveReport,
  getTripListings,
  updateTripLifecycle,
  getPaymentMonitor,
  getJoinActivity,
  getReviewsOverview,
  toggleUserBan,
  recalculateAllTrustScores,
};
