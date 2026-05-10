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

router.use(authMiddleware);
router.get("/profile", getProfile);
router.get("/:id", getPublicProfileById);
router.put(
  "/profile",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    validateRequest,
  ],
  updateProfile,
);
router.post("/upload-id", upload.single("governmentId"), uploadGovernmentId);
router.post("/upload-avatar", upload.single("avatar"), uploadAvatar);
module.exports = router;
