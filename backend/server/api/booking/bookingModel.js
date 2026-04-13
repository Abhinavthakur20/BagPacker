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
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
