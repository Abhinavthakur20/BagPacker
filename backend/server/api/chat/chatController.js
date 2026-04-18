const ChatMessage = require("./chatMessageModel");
const { canAccessChatRoom } = require("./chatAccess");

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));
    const skip = (page - 1) * limit;
    const canAccess = await canAccessChatRoom({ roomId, userId: req.user._id });

    if (!canAccess) {
      return res.status(403).json({ message: "You do not have access to this chat room" });
    }

    const messages = await ChatMessage.find({ roomId })
      .sort({ sentAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .select("roomId senderId senderName message sentAt")
      .lean();
    const total = await ChatMessage.countDocuments({ roomId });

    return res.status(200).json({
      items: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRoomMessages,
};
