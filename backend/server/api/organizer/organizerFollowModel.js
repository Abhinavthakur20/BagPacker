const mongoose = require("mongoose");

const organizerFollowSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
      index: true,
    },
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

organizerFollowSchema.index({ organizerId: 1, followerId: 1 }, { unique: true });

module.exports =
  mongoose.models.OrganizerFollow || mongoose.model("OrganizerFollow", organizerFollowSchema);
