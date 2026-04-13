const mongoose = require("mongoose");

const pickupPointSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true },
);

pickupPointSchema.index({ tripId: 1, sequence: 1 }, { unique: true });

module.exports =
  mongoose.models.PickupPoint || mongoose.model("PickupPoint", pickupPointSchema);
