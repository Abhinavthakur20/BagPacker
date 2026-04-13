let ioInstance = null;
const GroupChat = require("../api/groupChat/groupChatModel");

const initSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_room", async ({ roomId, userId }) => {
      if (!roomId || !userId) {
        return;
      }

      if (roomId.startsWith("trip_")) {
        const group = await GroupChat.findOne({ roomId }).select("members");
        const canJoin = group?.members?.some(
          (member) => String(member.userId) === String(userId) && !member.isRemoved,
        );
        if (!canJoin) {
          return;
        }
      }

      socket.join(roomId);
    });

    socket.on("send_message", async ({ roomId, message, sender, userId }) => {
      if (!roomId || !message || !sender || !userId) {
        return;
      }

      if (roomId.startsWith("trip_")) {
        const group = await GroupChat.findOne({ roomId }).select("members");
        const canSend = group?.members?.some(
          (member) => String(member.userId) === String(userId) && !member.isRemoved,
        );
        if (!canSend) {
          return;
        }
      }

      io.to(roomId).emit("receive_message", {
        roomId,
        message,
        sender,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("seat_update", ({ tripId, availableSeats }) => {
      if (!tripId) {
        return;
      }

      io.emit(`seat_update_${tripId}`, {
        tripId,
        availableSeats,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => ioInstance;

const emitSeatUpdate = (tripId, availableSeats) => {
  if (!ioInstance || !tripId) {
    return;
  }

  ioInstance.emit(`seat_update_${tripId}`, {
    tripId: String(tripId),
    availableSeats,
  });

  ioInstance.emit("seat_update", {
    tripId: String(tripId),
    availableSeats,
  });
};

module.exports = {
  initSocket,
  getIO,
  emitSeatUpdate,
};
