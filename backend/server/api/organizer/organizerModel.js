const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    gstNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    licenseUrl: {
      type: String,
      default: null,
    },
    bankAccountDetails: {
      type: String,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Organizer || mongoose.model("Organizer", organizerSchema);
