const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const sanitizedOriginal = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${sanitizedOriginal}`);
  },
});

const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i;

const fileFilter = (_req, file, cb) => {
  if (!allowedExtensions.test(file.originalname)) {
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
