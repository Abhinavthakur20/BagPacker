const mongoose = require("mongoose");
const Booking = require("../booking/bookingModel");
const Notification = require("../notification/notificationModel");
const Review = require("./reviewModel");
const User = require("../user/userModel");

const createReview = async (req, res) => {
  try {
    const { revieweeId, bookingId, rating, comment } = req.body;

    if (String(revieweeId) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot review yourself" });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      travelerId: req.user._id,
      status: "completed",
    });

    if (!booking) {
      return res.status(400).json({ message: "Only completed bookings can be reviewed" });
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
      revieweeId,
      bookingId,
      rating,
      comment: comment || null,
    });

    const [reviewStats] = await Review.aggregate([
      {
        $match: {
          revieweeId: new mongoose.Types.ObjectId(revieweeId),
        },
      },
      {
        $group: {
          _id: "$revieweeId",
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const trustScore = reviewStats ? Number(((reviewStats.averageRating / 5) * 100).toFixed(2)) : 0;

    await User.findByIdAndUpdate(revieweeId, { trustScore });

    await Notification.create({
      userId: revieweeId,
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
