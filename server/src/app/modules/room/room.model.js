const mongoose = require("mongoose");
const crypto = require("crypto");

const roomCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function createRoomCode() {
  return Array.from(crypto.randomBytes(8), (byte) =>
    roomCodeAlphabet[byte & 31],
  ).join("");
}

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    uid: { type: String, unique: true, sparse: true, default: createRoomCode },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SpaceUser",
      required: true,
    },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "SpaceUser" }],
  },
  { timestamps: true },
);

const Room = mongoose.model("Room", roomSchema);
Room.createRoomCode = createRoomCode;

module.exports = Room;
