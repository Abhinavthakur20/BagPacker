let ioInstance = null;
const GroupChat = require("../api/groupChat/groupChatModel");
const ChatMessage = require("../api/chat/chatMessageModel");
const { canAccessChatRoom } = require("../api/chat/chatAccess");
const User = require("../api/user/userModel");
const jwt = require("jsonwebtoken");

const initSocket = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const rawToken = String(socket.handshake.auth?.token || "").trim();
      if (!rawToken) {
        return next(new Error("Authentication required"));
      }

      const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7).trim() : rawToken;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name role");

      if (!user) {
        return next(new Error("Invalid authentication token"));
      }

      socket.data.user = {
        _id: String(user._id),
        name: user.name,
        role: user.role,
      };
      return next();
    } catch (_error) {
      return next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_room", async ({ roomId }) => {
      try {
        const authenticatedUserId = socket.data?.user?._id;
        if (!roomId || !authenticatedUserId) {
          return;
        }

        const canJoin = await canAccessChatRoom({ roomId, userId: authenticatedUserId });
        if (!canJoin) {
          return;
        }

        socket.join(roomId);
      } catch (_error) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("send_message", async ({ roomId, message, clientMessageId }) => {
      try {
        const authenticatedUserId = socket.data?.user?._id;
        const authenticatedUserName = socket.data?.user?.name;
        if (!roomId || !message || !authenticatedUserId) {
          return;
        }

        const MAX_MSG_LENGTH = 2000;
        const trimmedMessage = String(message).trim();
        if (!trimmedMessage) {
          return;
        }

        if (trimmedMessage.length > MAX_MSG_LENGTH) {
          socket.emit("error", { message: "Message too long" });
          return;
        }

        const canSend = await canAccessChatRoom({ roomId, userId: authenticatedUserId });
        if (!canSend) {
          return;
        }

        // Duplicate guard: if client provides a messageId, check for duplicates
        const sanitizedClientId = clientMessageId ? String(clientMessageId).trim().slice(0, 64) : null;
        if (sanitizedClientId) {
          const existing = await ChatMessage.findOne({ roomId, clientMessageId: sanitizedClientId }).select("_id").lean();
          if (existing) {
            return; // Already saved — skip duplicate
          }
        }

        const savedMessage = await ChatMessage.create({
          roomId,
          senderId: authenticatedUserId,
          senderName: authenticatedUserName,
          message: trimmedMessage,
          sentAt: new Date(),
          ...(sanitizedClientId ? { clientMessageId: sanitizedClientId } : {}),
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
      } catch (_error) {
        socket.emit("error", { message: "Failed to send message" });
      }
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

  ioInstance.to(`trip_${String(tripId)}`).emit(`seat_update_${tripId}`, {
    tripId: String(tripId),
    availableSeats,
  });
};

module.exports = {
  initSocket,
  getIO,
  emitSeatUpdate,
};
