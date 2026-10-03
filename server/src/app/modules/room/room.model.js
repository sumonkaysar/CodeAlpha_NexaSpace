const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpaceUser",
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "SpaceUser" }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Room", roomSchema);
