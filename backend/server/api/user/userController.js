const User = require("./userModel");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");
const { recalculateAndPersistTrustScore } = require("./trustScoreService");

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

const DOCUMENT_IMAGE_TRANSFORMATIONS = {
  width: 2000,
  crop: "limit",
  quality: "auto:good",
  fetch_format: "auto",
  dpr: "auto",
};

const getProfile = async (req, res) => {
  try {
    return res.status(200).json(sanitizeUser(req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getPublicProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("_id name role avatarUrl verificationStatus trustScore createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const phone = req.body.phone?.trim();
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (phone) {
      const duplicatePhone = await User.findOne({
        phone,
        _id: { $ne: req.user._id },
      });

      if (duplicatePhone) {
        return res.status(400).json({ message: "Phone is already registered" });
      }
    }

    const updateFields = { name };
    if (phone) {
      updateFields.phone = phone;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { returnDocument: "after", runValidators: true },
    ).select("-passwordHash");
    const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
    if (trustResult) {
      user.trustScore = trustResult.trustScore;
    }

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
      transformations: DOCUMENT_IMAGE_TRANSFORMATIONS,
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        governmentIdUrl: uploadedFile.secure_url,
        verificationStatus: "pending",
      },
      { returnDocument: "after", runValidators: true },
    ).select("-passwordHash");
    const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
    if (trustResult) {
      user.trustScore = trustResult.trustScore;
    }

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
  getPublicProfileById,
  updateProfile,
  uploadGovernmentId,
};
