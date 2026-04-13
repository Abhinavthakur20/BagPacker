let ioInstance = null;
const GroupChat = require("../api/groupChat/groupChatModel");
const ChatMessage = require("../api/chat/chatMessageModel");
const { canAccessChatRoom } = require("../api/chat/chatAccess");
const User = require("../api/user/userModel");

const initSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_room", async ({ roomId, userId }) => {
      if (!roomId || !userId) {
        return;
      }

      const canJoin = await canAccessChatRoom({ roomId, userId });
      if (!canJoin) {
        return;
      }

      socket.join(roomId);
    });

    socket.on("send_message", async ({ roomId, message, userId }) => {
      if (!roomId || !message || !userId) {
        return;
      }

      const trimmedMessage = String(message).trim();
      if (!trimmedMessage) {
        return;
      }

      const canSend = await canAccessChatRoom({ roomId, userId });
      if (!canSend) {
        return;
      }

      const senderUser = await User.findById(userId).select("name");
      if (!senderUser) {
        return;
      }

      const savedMessage = await ChatMessage.create({
        roomId,
        senderId: userId,
        senderName: senderUser.name,
        message: trimmedMessage,
        sentAt: new Date(),
      });

      if (roomId.startsWith("trip_")) {
        await GroupChat.updateOne({ roomId }, { $set: { updatedAt: savedMessage.sentAt } });
      }

      io.to(roomId).emit("receive_message", {
        id: String(savedMessage._id),
        roomId,
        message: savedMessage.message,
        sender: savedMessage.senderName,
        senderId: String(savedMessage.senderId),
        timestamp: savedMessage.sentAt.toISOString(),
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
