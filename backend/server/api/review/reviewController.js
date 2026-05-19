const Booking = require("../booking/bookingModel");
const Notification = require("../notification/notificationModel");
const Review = require("./reviewModel");
const { recalculateAndPersistTrustScore } = require("../user/trustScoreService");

const createReview = async (req, res) => {
  try {
    if (!req.user?.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email before reviewing a trip" });
    }

    const { revieweeId, bookingId, rating, comment } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      travelerId: req.user._id,
      status: { $in: ["confirmed", "completed"] },
    }).populate({
      path: "tripId",
      populate: {
        path: "organizerId",
        select: "userId",
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const tripEndDate = booking.tripId?.endDate;
    if (booking.status !== "completed" && (!tripEndDate || new Date(tripEndDate) >= new Date())) {
      return res.status(400).json({ message: "You can only review trips that have ended" });
    }

    // Reviews are stored against the organizer's User id, not the Organizer profile id.
    const organizerProfileId = booking.tripId?.organizerId?._id || booking.tripId?.organizerId;
    const organizerUserId = booking.tripId?.organizerId?.userId;
    const isOrganizerUserId = String(organizerUserId) === String(revieweeId);
    const isOrganizerProfileId = String(organizerProfileId) === String(revieweeId);
    if (!organizerUserId || (!isOrganizerUserId && !isOrganizerProfileId)) {
      return res.status(400).json({ message: "Invalid reviewee for this booking" });
    }
    if (String(organizerUserId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot review yourself" });
    }

    const existingReview = await Review.findOne({
      reviewerId: req.user._id,
      bookingId,
    });

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this booking" });
    }

    const review = await Review.create({
      reviewerId: req.user._id,
      revieweeId: organizerUserId,
      bookingId,
      rating,
      comment: comment || null,
    });

    const trustResult = await recalculateAndPersistTrustScore(organizerUserId);
    const trustScore = trustResult?.trustScore ?? 0;

    await Notification.create({
      userId: organizerUserId,
      type: "review_received",
      message: `${req.user.name} left you a new review.`,
    });

    return res.status(201).json({
      review,
      trustScore,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReviewsForUser = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find({ revieweeId: req.params.userId })
        .sort({ createdAt: -1 })
        .populate("reviewerId", "name")
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ revieweeId: req.params.userId }),
    ]);

    return res.status(200).json({
      items: reviews,
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
  createReview,
  getReviewsForUser,
};
