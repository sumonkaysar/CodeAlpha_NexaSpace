const Room = require("./room.model");
const {
  ensureRoomCode,
  fail,
  findRoomByIdentifier,
  getAccessibleRoom,
} = require("./room.service");

exports.list = async (req, res) => {
  const rooms = await Room.find({ members: req.user.id })
    .populate("owner", "name")
    .sort({ updatedAt: -1 });
  for (const room of rooms) await ensureRoomCode(room);
  res.json(
    rooms.map((room) => ({
      ...room.toObject(),
      isOwner: String(room.owner._id) === req.user.id,
    })),
  );
};

exports.create = async (req, res) => {
  if (typeof req.body.name !== "string" || !req.body.name.trim())
    throw fail("Room name is required");
  const room = await Room.create({
    name: req.body.name.trim(),
    owner: req.user.id,
    members: [req.user.id],
  });
  res.status(201).json(room);
};

exports.get = async (req, res) =>
  res.json(await getAccessibleRoom(req.params.id, req.user.id));

exports.join = async (req, res) => {
  const room = await findRoomByIdentifier(req.params.id);
  if (!room) throw fail("Room not found", 404);
  if (room.status !== "open") throw fail("This room is closed", 409);
  if (!room.members.some((member) => String(member) === req.user.id)) {
    room.members.push(req.user.id);
    await room.save();
  }
  await ensureRoomCode(room);
  res.json({
    _id: room.id,
    uid: room.uid,
    name: room.name,
    status: room.status,
    members: room.members.length,
  });
};

exports.updateStatus = async (req, res) => {
  if (!["open", "closed"].includes(req.body.status))
    throw fail("Room status must be open or closed");
  const room = await getAccessibleRoom(req.params.id, req.user.id);
  if (String(room.owner._id) !== req.user.id)
    throw fail("Only the room owner can change its status", 403);
  room.status = req.body.status;
  await room.save();
  if (room.status === "closed")
    req.app.get("io").to(`room:${room.id}`).emit("room:closed", {
      ownerId: req.user.id,
    });
  res.json({ _id: room.id, uid: room.uid, status: room.status });
};

exports.leave = async (req, res) => {
  const room = await getAccessibleRoom(req.params.id, req.user.id);
  const isOwner = String(room.owner._id) === req.user.id;
  if (isOwner && room.status !== "closed") {
    room.status = "closed";
    await room.save();
    req.app.get("io").to(`room:${room.id}`).emit("room:closed", {
      ownerId: req.user.id,
    });
  }
  res.json({ _id: room.id, uid: room.uid, status: room.status });
};

exports.remove = async (req, res) => {
  const room = await getAccessibleRoom(req.params.id, req.user.id);
  if (String(room.owner._id) !== req.user.id)
    throw fail("Only the room owner can delete it", 403);
  await room.deleteOne();
  res.status(204).end();
};
