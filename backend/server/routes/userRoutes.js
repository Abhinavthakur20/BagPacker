const express = require("express");
const { body } = require("express-validator");
const {
  getProfile,
  getPublicProfileById,
  updateProfile,
  uploadGovernmentId,
  uploadAvatar,
} = require("../api/user/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

// Concrete / Protected routes (must be placed before dynamic parameters)
router.get("/profile", authMiddleware, getProfile);
router.put(
  "/profile",
  authMiddleware,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    validateRequest,
  ],
  updateProfile,
);
router.post("/upload-id", authMiddleware, upload.single("governmentId"), uploadGovernmentId);
router.post("/upload-avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

// Dynamic routes (fallback for specific parameters)
router.get("/:id", getPublicProfileById);

module.exports = router;
