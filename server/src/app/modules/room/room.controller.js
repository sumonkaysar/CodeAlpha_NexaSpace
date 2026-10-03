const Room = require("./room.model");
const mongoose = require("mongoose");
const { fail, getAccessibleRoom } = require("./room.service");

exports.list = async (req, res) =>
  res.json(
    await Room.find({ members: req.user.id })
      .populate("owner", "name")
      .sort({ updatedAt: -1 }),
  );
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    throw fail("Invalid room id");
  const room = await Room.findById(req.params.id);
  if (!room) throw fail("Room not found", 404);
  if (!room.members.some((member) => String(member) === req.user.id)) {
    room.members.push(req.user.id);
    await room.save();
  }
  res.json({ id: room.id, name: room.name, members: room.members.length });
};
exports.remove = async (req, res) => {
  const room = await getAccessibleRoom(req.params.id, req.user.id);
  if (String(room.owner._id) !== req.user.id)
    throw fail("Only the room owner can delete it", 403);
  await room.deleteOne();
  res.status(204).end();
};
