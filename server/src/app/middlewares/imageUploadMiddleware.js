const crypto = require("crypto");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: process.env.CLOUDINARY_FOLDER || "nexaspace",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    public_id: `image-${crypto.randomUUID()}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        Object.assign(
          new Error("Only JPG, PNG, WEBP, and GIF images are allowed"),
          { statusCode: 400 },
        ),
      );
    }
    callback(null, true);
  },
}).single("image");

module.exports = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      const statusCode =
        error.statusCode ||
        error.http_code ||
        (error instanceof multer.MulterError
          ? error.code === "LIMIT_FILE_SIZE"
            ? 413
            : 400
          : 502);
      error.statusCode = statusCode;
      return next(error);
    }

    if (!req.file) {
      return next(
        Object.assign(new Error("Choose an image to upload"), {
          statusCode: 400,
        }),
      );
    }

    next();
  });
};
