const ChatMessage = require("./chatMessageModel");
const { canAccessChatRoom } = require("./chatAccess");

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const canAccess = await canAccessChatRoom({ roomId, userId: req.user._id });

    if (!canAccess) {
      return res.status(403).json({ message: "You do not have access to this chat room" });
    }

    const messages = await ChatMessage.find({ roomId })
      .sort({ sentAt: 1, _id: 1 })
      .select("roomId senderId senderName message sentAt");

    return res.status(200).json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRoomMessages,
};
