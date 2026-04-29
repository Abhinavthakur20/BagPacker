const GroupChat = require("./groupChatModel");
const Organizer = require("../organizer/organizerModel");

const buildTripRoomId = (tripId) => `trip_${String(tripId)}`;

const ensureTripGroupChat = async ({ tripId, organizerUserId }) => {
  const roomId = buildTripRoomId(tripId);
  const groupChat = await GroupChat.findOneAndUpdate(
    { tripId },
    {
      $setOnInsert: {
        tripId,
        organizerUserId,
        roomId,
        members: [
          {
            userId: organizerUserId,
            role: "admin",
            joinedAt: new Date(),
            isRemoved: false,
            removedAt: null,
            removedBy: null,
          },
        ],
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return groupChat;
};

const addMemberToTripGroup = async ({ tripId, userId }) => {
  const groupChat = await GroupChat.findOne({ tripId });

  if (!groupChat) {
    return null;
  }

  const existingMemberIndex = groupChat.members.findIndex(
    (member) => String(member.userId) === String(userId),
  );

  if (existingMemberIndex >= 0) {
    groupChat.members[existingMemberIndex].isRemoved = false;
    groupChat.members[existingMemberIndex].removedAt = null;
    groupChat.members[existingMemberIndex].removedBy = null;
    if (!groupChat.members[existingMemberIndex].joinedAt) {
      groupChat.members[existingMemberIndex].joinedAt = new Date();
    }
  } else {
    groupChat.members.push({
      userId,
      role: "member",
      joinedAt: new Date(),
      isRemoved: false,
      removedAt: null,
      removedBy: null,
    });
  }

  await groupChat.save();
  return groupChat;
};

const getMyTripGroups = async (req, res) => {
  try {
    const groups = await GroupChat.find({
      members: {
        $elemMatch: {
          userId: req.user._id,
          isRemoved: false,
        },
      },
    })
      .sort({ updatedAt: -1 })
      .populate("tripId", "title source destination startDate endDate")
      .populate("organizerUserId", "name")
      .populate("members.userId", "name trustScore role")
      .lean();

    const payload = groups.map((group) => {
      const myMembership = group.members.find(
        (member) => String(member.userId?._id || member.userId) === String(req.user._id),
      );
      const activeMembers = group.members.filter((member) => !member.isRemoved);

      return {
        _id: group._id,
        tripId: group.tripId,
        roomId: group.roomId,
        organizerUserId: group.organizerUserId,
        myRole: myMembership?.role || "member",
        memberCount: activeMembers.length,
        members: activeMembers,
      };
    });

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeMemberFromTripGroup = async (req, res) => {
  try {
    const groupChat = await GroupChat.findById(req.params.groupId).populate(
      "tripId",
      "organizerId title",
    );

    if (!groupChat) {
      return res.status(404).json({ message: "Trip chat group not found" });
    }

    const organizer = await Organizer.findById(groupChat.tripId?.organizerId);

    if (!organizer || String(organizer.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only organizer admin can remove members" });
    }

    if (String(req.params.memberUserId) === String(organizer.userId)) {
      return res.status(400).json({ message: "Organizer admin cannot be removed" });
    }

    const member = groupChat.members.find(
      (item) => String(item.userId) === String(req.params.memberUserId),
    );

    if (!member || member.isRemoved) {
      return res.status(404).json({ message: "Member not found in this trip group" });
    }

    member.isRemoved = true;
    member.removedAt = new Date();
    member.removedBy = req.user._id;
    await groupChat.save();

    return res.status(200).json({ message: "Member removed from trip chat group" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  buildTripRoomId,
  ensureTripGroupChat,
  addMemberToTripGroup,
  getMyTripGroups,
  removeMemberFromTripGroup,
};
