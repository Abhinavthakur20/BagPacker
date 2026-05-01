const Notification = require("../notification/notificationModel");
const Organizer = require("../organizer/organizerModel");
const Report = require("../report/reportModel");
const User = require("../user/userModel");

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return res.status(200).json({
      items: users,
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

const getPendingOrganizers = async (_req, res) => {
  try {
    const organizers = await Organizer.find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .populate("userId", "-passwordHash");

    return res.status(200).json(organizers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const reviewOrganizerApproval = async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id).populate("userId", "name");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    organizer.approvalStatus = req.body.approvalStatus;
    organizer.approvedAt = req.body.approvalStatus === "approved" ? new Date() : null;
    await organizer.save();

    await Notification.create({
      userId: organizer.userId._id,
      type: "approval_status",
      message: `Your organizer profile has been ${req.body.approvalStatus}.`,
    });

    return res.status(200).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPendingVerifications = async (_req, res) => {
  try {
    const users = await User.find({
      verificationStatus: "pending",
      governmentIdUrl: { $nin: [null, ""] },
    })
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateVerificationStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: req.body.verificationStatus },
      { returnDocument: "after", runValidators: true },
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getReports = async (_req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate("reportedBy", "name")
      .populate("reportedUserId", "name");

    return res.status(200).json(reports);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resolveReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = "resolved";
    report.adminAction = req.body.adminAction;
    await report.save();

    if (req.body.adminAction === "ban") {
      await User.findByIdAndUpdate(report.reportedUserId, {
        isBanned: true,
      });
    }

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getPendingOrganizers,
  reviewOrganizerApproval,
  getPendingVerifications,
  updateVerificationStatus,
  getReports,
  resolveReport,
};
