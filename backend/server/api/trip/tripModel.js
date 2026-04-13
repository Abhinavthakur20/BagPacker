const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    pricePerPerson: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSeats: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSeats: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Trip || mongoose.model("Trip", tripSchema);
