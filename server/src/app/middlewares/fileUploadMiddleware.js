const crypto = require("crypto");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder:
      process.env.CLOUDINARY_FILES_FOLDER ||
      `${process.env.CLOUDINARY_FOLDER || "nexaspace"}/encrypted-files`,
    resource_type: "raw",
    public_id: `encrypted-${crypto.randomUUID()}.txt`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
}).single("file");

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
        Object.assign(new Error("Encrypted file payload is required"), {
          statusCode: 400,
        }),
      );
    }

    next();
  });
};
