const mongoose = require("mongoose");

const organizerPostMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  { _id: false },
);

const organizerPostSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    media: {
      type: [organizerPostMediaSchema],
      default: [],
    },
  },
  { timestamps: true },
);

organizerPostSchema.index({ organizerId: 1, createdAt: -1 });

module.exports =
  mongoose.models.OrganizerPost || mongoose.model("OrganizerPost", organizerPostSchema);
