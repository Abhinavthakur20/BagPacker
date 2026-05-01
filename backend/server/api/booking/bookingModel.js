const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    pickupPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupPoint",
      required: true,
    },
    seatsBooked: {
      type: Number,
      required: true,
      min: 1,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    paymentProvider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
    },
    paymentStatus: {
      type: String,
      enum: ["created", "paid", "failed", "refund_required", "refunded"],
      default: "created",
      index: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    paymentCapturedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

bookingSchema.index({ travelerId: 1, createdAt: -1 });
bookingSchema.index({ tripId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ travelerId: 1, tripId: 1, status: 1, paymentStatus: 1 });

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
