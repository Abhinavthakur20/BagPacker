const Organizer = require("./organizerModel");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

const DOCUMENT_IMAGE_TRANSFORMATIONS = {
  width: 2000,
  crop: "limit",
  quality: "auto:good",
  fetch_format: "auto",
  dpr: "auto",
};

const registerOrganizerProfile = async (req, res) => {
  try {
    const { businessName, gstNumber, bankAccountDetails } = req.body;

    const existingOrganizer = await Organizer.findOne({ userId: req.user._id });

    if (existingOrganizer) {
      return res.status(400).json({ message: "Organizer profile already exists" });
    }

    let licenseUrl = null;
    if (req.file) {
      const uploadedLicense = await uploadBufferToCloudinary({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        folder: "bagpacker/organizer-licenses",
        resourceType: "auto",
        transformations: DOCUMENT_IMAGE_TRANSFORMATIONS,
      });
      licenseUrl = uploadedLicense.secure_url;
    }

    const organizer = await Organizer.create({
      userId: req.user._id,
      businessName: businessName.trim(),
      gstNumber: gstNumber ? gstNumber.trim() : undefined,
      licenseUrl,
      bankAccountDetails: bankAccountDetails ? bankAccountDetails.trim() : null,
    });

    return res.status(201).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyOrganizerProfile = async (req, res) => {
  try {
    const organizer = await Organizer.findOne({ userId: req.user._id }).populate({
      path: "userId",
      select: "-passwordHash",
    });

    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    return res.status(200).json(organizer);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerOrganizerProfile,
  getMyOrganizerProfile,
};
