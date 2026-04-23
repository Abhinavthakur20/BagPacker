const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getMyOrganizerProfile,
  getMyOrganizerTrips,
  getMyTripBookings,
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
router.get("/me/trips", getMyOrganizerTrips);
router.get(
  "/me/trips/:tripId/bookings",
  [
    param("tripId").isMongoId().withMessage("Valid tripId is required"),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "completed"])
      .withMessage("status must be pending, confirmed, cancelled, or completed"),
    validateRequest,
  ],
  getMyTripBookings,
);

module.exports = router;
