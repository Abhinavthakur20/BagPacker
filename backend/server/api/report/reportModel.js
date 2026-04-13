const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "under_review", "resolved"],
      default: "pending",
    },
    adminAction: {
      type: String,
      enum: ["warning", "suspension", "ban", "dismissed", null],
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Report || mongoose.model("Report", reportSchema);
