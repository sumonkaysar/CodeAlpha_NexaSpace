const express = require("express");
const authenticateToken = require("../../middlewares/authMiddleware");
const uploadImage = require("../../middlewares/imageUploadMiddleware");

const UploadRouter = express.Router();

UploadRouter.post(
  "/image",
  authenticateToken,
  uploadImage,
  (req, res) => {
    res.status(201).json({
      message: "Image uploaded successfully",
      url: req.file.path,
      publicId: req.file.filename,
    });
  },
);

module.exports = UploadRouter;
