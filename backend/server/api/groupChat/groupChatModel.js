const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false },
);

const groupChatSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },
    organizerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.GroupChat || mongoose.model("GroupChat", groupChatSchema);
