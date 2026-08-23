const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("peer-joined");
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("signal", (payload) => {
    socket.to(payload.roomId).emit("signal", payload.signal);
  });
});

console.log("Signaling server running on ws://localhost:3001");
