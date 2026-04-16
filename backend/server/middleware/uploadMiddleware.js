const multer = require("multer");

const storage = multer.memoryStorage();

const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const fileFilter = (_req, file, cb) => {
  if (!allowedExtensions.test(file.originalname) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Only jpg, jpeg, png, webp, and pdf files are allowed"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
