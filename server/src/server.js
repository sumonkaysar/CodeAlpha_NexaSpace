require("dotenv").config();
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const app = require("./app");
const corsOptions = require("./app/config/corsOptions");
const connectDB = require("./app/config/db");
const Room = require("./app/modules/room/room.model");

const PORT = process.env.PORT || 5200;
const dbReady = connectDB().then(
  () => null,
  (error) => {
    console.error("NexaSpace database connection failed:", error.message);
    return error;
  },
);
async function ensureDatabaseReady() {
  const error = await dbReady;
  if (error) throw error;
}

const server = http.createServer((req, res) => {
  ensureDatabaseReady()
    .then(() => app(req, res))
    .catch((error) => {
      console.error("NexaSpace database connection failed:", error.message);
      res.statusCode = 503;
      res.end("Database unavailable");
    });
});
const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

io.use(async (socket, next) => {
  try {
    await ensureDatabaseReady();
  } catch (_error) {
    return next(new Error("Database unavailable"));
  }

  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_error) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.on("room:join", async (roomId, callback = () => {}) => {
    try {
      const room = await Room.findById(roomId);
      if (
        !room ||
        room.status !== "open" ||
        !room.members.some((member) => String(member) === socket.user.id)
      )
        return callback({
          error:
            room?.status === "closed"
              ? "This room is closed"
              : "Join the room before connecting",
        });
      socket.join(`room:${room.id}`);
      socket.to(`room:${room.id}`).emit("peer:joined", {
        peerId: socket.id,
        user: { id: socket.user.id, name: socket.user.name },
      });
      const peers = [
        ...(io.sockets.adapter.rooms.get(`room:${room.id}`) || []),
      ].filter((id) => id !== socket.id);
      callback({ roomId: room.id, peers });
    } catch (_error) {
      callback({ error: "Could not join room" });
    }
  });

  for (const eventName of ["webrtc:offer", "webrtc:answer", "webrtc:ice"]) {
    socket.on(eventName, (payload = {}) => {
      if (
        typeof payload.to !== "string" ||
        (!payload.description && !payload.candidate)
      )
        return;

      const room = [...socket.rooms].find((name) => name.startsWith("room:"));
      const target = io.sockets.sockets.get(payload.to);

      if (room && target?.rooms.has(room))
        target.emit(eventName, {
          from: socket.id,
          description: payload.description,
          candidate: payload.candidate,
        });
    });
  }

  socket.on("disconnecting", () => {
    for (const room of socket.rooms)
      if (room.startsWith("room:"))
        socket.to(room).emit("peer:left", { peerId: socket.id });
  });
});

if (require.main === module) {
  dbReady
    .then((error) => {
      if (error) throw error;
      server.listen(PORT, () => console.log(`NexaSpace listening on ${PORT}`));
    })
    .catch(() => process.exit(1));
}

module.exports = server;
