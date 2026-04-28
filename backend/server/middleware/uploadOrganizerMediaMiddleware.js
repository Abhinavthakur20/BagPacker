const multer = require("multer");

const storage = multer.memoryStorage();

const allowedExtensions = /\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const fileFilter = (_req, file, cb) => {
  if (!allowedExtensions.test(file.originalname) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Only jpg, jpeg, png, webp, mp4, mov, and webm files are allowed"));
  }

  return cb(null, true);
};

const uploadOrganizerMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

module.exports = uploadOrganizerMedia;
