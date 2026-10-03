const path = require("path");
const fs = require("fs/promises");
const cloudinary = require("../../config/cloudinary");
const File = require("./file.model");
const { fail, getAccessibleRoom } = require("../room/room.service");

exports.list = async (req, res) => {
  await getAccessibleRoom(req.query.room, req.user.id);
  res.json(
    await File.find({ room: req.query.room })
      .select("-storedName -cloudinaryUrl -cloudinaryPublicId")
      .populate("uploader", "name")
      .sort({ createdAt: -1 }),
  );
};

exports.upload = async (req, res) => {
  if (!req.file) throw fail("Encrypted file payload is required");
  const roomId = req.body.room;
  let metadataSaved = false;
  try {
    await getAccessibleRoom(roomId, req.user.id);
    const file = await File.create({
      room: roomId,
      uploader: req.user.id,
      originalName: path
        .basename(req.body.name || "encrypted-file.bin")
        .slice(0, 255),
      storedName: req.file.filename,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      mimeType: "application/octet-stream",
      size: req.file.size,
    });
    metadataSaved = true;
    req.app.get("io").to(`room:${roomId}`).emit("file:created");
    res.status(201).json({
      id: file.id,
      room: file.room,
      originalName: file.originalName,
      size: file.size,
      createdAt: file.createdAt,
    });
  } catch (error) {
    if (!metadataSaved) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: "raw",
        });
      } catch (cleanupError) {
        console.error(
          "Failed to remove unreferenced Cloudinary upload:",
          cleanupError,
        );
      }
    }
    throw error;
  }
};

exports.download = async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) throw fail("File not found", 404);
  await getAccessibleRoom(file.room, req.user.id);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.originalName)}"`,
  );
  if (file.cloudinaryUrl) {
    const response = await fetch(file.cloudinaryUrl);
    if (!response.ok) throw fail("Stored file could not be retrieved", 502);
    return res.send(Buffer.from(await response.arrayBuffer()));
  }

  res.sendFile(
    path.resolve(process.env.UPLOAD_DIR || "./uploads", file.storedName),
  );
};
