const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";

const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // ============================================================
  // SOCKET.IO SIGNALING
  // ============================================================

  io.on("connection", (socket) => {
    console.log(
      "[SIGNALING] User connected:",
      socket.id
    );

    socket.on("join-room", (roomId) => {
      socket.join(roomId);

      socket
        .to(roomId)
        .emit("peer-joined");

      console.log(
        `[SIGNALING] ${socket.id} joined room ${roomId}`
      );
    });

    socket.on("signal", (payload) => {
      socket
        .to(payload.roomId)
        .emit(
          "signal",
          payload.signal
        );
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[SIGNALING] ${socket.id} disconnected: ${reason}`
      );
    });
  });

  // ============================================================
  // START
  // ============================================================

  httpServer.listen(
    port,
    hostname,
    () => {
      console.log(
        `[SERVER] DropBeam running on port ${port}`
      );
      console.log(
        `[SERVER] Environment: ${
          dev
            ? "development"
            : "production"
        }`
      );
    }
  );
});