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
    sourceLatitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    sourceLongitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
    destinationLatitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },
    destinationLongitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },
    fuelPricePerLitre: {
      type: Number,
      min: 0,
      default: null,
    },
    mileage: {
      type: Number,
      min: 0,
      default: null,
    },
    tollAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    distanceKm: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedFuelCost: {
      type: Number,
      min: 0,
      default: null,
    },
    estimatedCostPerPerson: {
      type: Number,
      min: 0,
      default: null,
    },
    travelDate: {
      type: Date,
      required: true,
      index: true,
    },
    maxCompanions: {
      type: Number,
      required: true,
      min: 1,
    },
    seatsAvailable: {
      type: Number,
      min: 0,
      default: function defaultSeatsAvailable() {
        return this.maxCompanions || 1;
      },
    },
    genderPreference: {
      type: String,
      enum: ["M", "F", "Any"],
      default: "Any",
    },
    vehicleType: {
      type: String,
      enum: ["car", "bike", null],
      default: null,
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
personalTripPostSchema.index({ source: 1, destination: 1, travelDate: 1, status: 1 });

module.exports =
  mongoose.models.PersonalTripPost ||
  mongoose.model("PersonalTripPost", personalTripPostSchema);
