const mongoose = require("mongoose");

const companionRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    travelDate: {
      type: Date,
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["car", "bike", null],
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    requestType: {
      type: String,
      enum: ["booking_match", "personal_trip_post"],
      default: "booking_match",
      index: true,
    },
    personalTripPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonalTripPost",
      default: null,
      index: true,
    },
    chatRoomId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.CompanionRequest ||
  mongoose.model("CompanionRequest", companionRequestSchema);
