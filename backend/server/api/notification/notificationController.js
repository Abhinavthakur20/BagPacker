const Notification = require("./notificationModel");

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        isRead: true,
      },
      { returnDocument: "after" },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
};
