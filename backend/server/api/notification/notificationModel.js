const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "booking_cancelled",
        "approval_status",
        "companion_request",
        "trip_alert",
        "review_received",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
