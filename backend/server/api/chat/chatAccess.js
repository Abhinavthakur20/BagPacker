const GroupChat = require("../groupChat/groupChatModel");
const CompanionRequest = require("../companion/companionRequestModel");

const canAccessChatRoom = async ({ roomId, userId }) => {
  if (!roomId || !userId) {
    return false;
  }

  const normalizedUserId = String(userId);

  if (roomId.startsWith("trip_")) {
    const group = await GroupChat.findOne({ roomId }).select("members");
    return Boolean(
      group?.members?.some(
        (member) => String(member.userId) === normalizedUserId && !member.isRemoved,
      ),
    );
  }

  const companionRoomMembers = roomId.split("_");
  if (companionRoomMembers.length !== 2) {
    return false;
  }

  if (!companionRoomMembers.includes(normalizedUserId)) {
    return false;
  }

  const acceptedRequest = await CompanionRequest.findOne({
    chatRoomId: roomId,
    status: "accepted",
    $or: [{ requesterId: userId }, { receiverId: userId }],
  }).select("_id");

  return Boolean(acceptedRequest);
};

module.exports = {
  canAccessChatRoom,
};
