const mongoose = require("mongoose");

const personalTripPostSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    travelDate: {
      type: Date,
      required: true,
      index: true,
    },
    maxCompanions: {
      type: Number,
      enum: [2, 3],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    acceptedCompanionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "closed", "cancelled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

personalTripPostSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
personalTripPostSchema.index({ source: 1, destination: 1, travelDate: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.PersonalTripPost ||
  mongoose.model("PersonalTripPost", personalTripPostSchema);
