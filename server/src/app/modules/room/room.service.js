const mongoose = require("mongoose");
const Room = require("./room.model");

const fail = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

async function findRoomByIdentifier(identifier) {
  if (typeof identifier !== "string" || !identifier.trim())
    throw fail("Invalid room id");

  const roomCode = identifier.trim().toUpperCase();
  let room = await Room.findOne({ uid: roomCode });
  if (!room && mongoose.Types.ObjectId.isValid(identifier))
    room = await Room.findById(identifier);
  return room;
}

async function ensureRoomCode(room) {
  if (!room.uid) {
    room.uid = Room.createRoomCode();
    await room.save();
  }
  return room;
}

async function getAccessibleRoom(roomId, userId) {
  const room = await findRoomByIdentifier(roomId);
  if (!room) throw fail("Room not found", 404);
  if (!room.members.some((member) => String(member._id || member) === userId))
    throw fail("Room not found", 404);
  await ensureRoomCode(room);
  return room.populate("owner", "name");
}

module.exports = {
  ensureRoomCode,
  fail,
  findRoomByIdentifier,
  getAccessibleRoom,
};
