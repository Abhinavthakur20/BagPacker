const Report = require("./reportModel");
const User = require("../user/userModel");

const createReport = async (req, res) => {
  try {
    const reportedUserId = String(req.body.reportedUserId || "").trim();
    const reason = String(req.body.reason || "").trim();

    if (!reportedUserId || !reason) {
      return res.status(400).json({ message: "reportedUserId and reason are required" });
    }

    if (String(req.user._id) === reportedUserId) {
      return res.status(400).json({ message: "You cannot report your own account" });
    }

    const targetUser = await User.findById(reportedUserId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    const existingOpenReport = await Report.findOne({
      reportedBy: req.user._id,
      reportedUserId,
      status: { $in: ["pending", "under_review"] },
    }).select("_id");

    if (existingOpenReport) {
      return res.status(409).json({ message: "You already have an open report for this user" });
    }

    const report = await Report.create({
      reportedBy: req.user._id,
      reportedUserId,
      reason,
      status: "pending",
    });

    const populated = await Report.findById(report._id)
      .populate("reportedBy", "name email")
      .populate("reportedUserId", "name email");

    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const query = {
      reportedBy: req.user._id,
    };

    if (req.query.status) {
      query.status = String(req.query.status).trim();
    }

    const [items, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reportedBy", "name email")
        .populate("reportedUserId", "name email"),
      Report.countDocuments(query),
    ]);

    return res.status(200).json({
      items,
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
  createReport,
  getMyReports,
};
