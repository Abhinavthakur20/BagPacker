const express = require("express");
const { body } = require("express-validator");
const {
  getMyOrganizerProfile,
  registerOrganizerProfile,
} = require("../api/organizer/organizerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["organizer"]));

router.post(
  "/",
  upload.single("license"),
  [
    body("businessName").trim().notEmpty().withMessage("Business name is required"),
    validateRequest,
  ],
  registerOrganizerProfile,
);
router.get("/me", getMyOrganizerProfile);

module.exports = router;
