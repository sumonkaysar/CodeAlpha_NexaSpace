const express = require("express");
const cors = require("cors");
const AuthRouter = require("./app/modules/auth/auth.route");
const RoomRouter = require("./app/modules/room/room.route");
const FileRouter = require("./app/modules/file/file.route");
const UploadRouter = require("./app/modules/upload/upload.route");
const notFoundMiddleware = require("./app/middlewares/notFoundMiddleware");
const errorHandlerMiddleware = require("./app/middlewares/errorHandlerMiddleware");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", AuthRouter);
app.use("/api/rooms", RoomRouter);
app.use("/api/files", FileRouter);
app.use("/api/uploads", UploadRouter);
app.get("/", (_req, res) =>
  res.json({ name: "NexaSpace API", status: "ready" }),
);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;
