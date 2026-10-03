const mongoose = require("mongoose");
const Room = require("./room.model");

const fail = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
async function getAccessibleRoom(roomId, userId) {
  if (!mongoose.Types.ObjectId.isValid(roomId)) throw fail("Invalid room id");
  const room = await Room.findOne({ _id: roomId, members: userId }).populate(
    "owner",
    "name",
  );
  if (!room) throw fail("Room not found", 404);
  return room;
}

module.exports = { fail, getAccessibleRoom };
