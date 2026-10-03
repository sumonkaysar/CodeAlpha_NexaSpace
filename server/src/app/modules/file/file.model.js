const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpaceUser",
      required: true,
    },
    originalName: { type: String, required: true, maxlength: 255 },
    storedName: { type: String, required: true, unique: true },
    cloudinaryUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SharedFile", fileSchema);
