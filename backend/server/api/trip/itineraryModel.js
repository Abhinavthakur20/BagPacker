const mongoose = require("mongoose");

const itinerarySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    activities: {
      type: String,
      required: true,
      trim: true,
    },
    accommodation: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true },
);

itinerarySchema.index({ tripId: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.models.Itinerary || mongoose.model("Itinerary", itinerarySchema);
