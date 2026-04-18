const User = require("./userModel");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  authProvider: user.authProvider,
  avatarUrl: user.avatarUrl,
  verificationStatus: user.verificationStatus,
  governmentIdUrl: user.governmentIdUrl,
  trustScore: user.trustScore,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getProfile = async (req, res) => {
  try {
    return res.status(200).json(sanitizeUser(req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const duplicatePhone = await User.findOne({
      phone: req.body.phone.trim(),
      _id: { $ne: req.user._id },
    });

    if (duplicatePhone) {
      return res.status(400).json({ message: "Phone is already registered" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: req.body.name.trim(),
        phone: req.body.phone.trim(),
      },
      { returnDocument: "after", runValidators: true },
    ).select("-passwordHash");

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const uploadGovernmentId = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Government ID file is required" });
    }

    const uploadedFile = await uploadBufferToCloudinary({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      folder: "bagpacker/government-ids",
      resourceType: "auto",
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        governmentIdUrl: uploadedFile.secure_url,
        verificationStatus: "pending",
      },
      { returnDocument: "after", runValidators: true },
    ).select("-passwordHash");

    return res.status(200).json({
      message: "Government ID uploaded successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadGovernmentId,
};
