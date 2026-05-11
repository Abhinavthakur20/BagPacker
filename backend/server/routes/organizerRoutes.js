const express = require("express");
const { body, param, query } = require("express-validator");
const {
  createOrganizerPost,
  deleteMyOrganizerPost,
  followOrganizer,
  getMyOrganizerPosts,
  getMyOrganizerProfile,
  getOrganizerFollowStatus,
  getMyOrganizerTrips,
  getMyOrganizerFinance,
  getMyTripBookings,
  getPublicOrganizerProfileByUserId,
  registerOrganizerProfile,
  unfollowOrganizer,
} = require("../api/organizer/organizerController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const uploadOrganizerMedia = require("../middleware/uploadOrganizerMediaMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.get(
  "/public/user/:userId",
  [param("userId").isMongoId().withMessage("Valid userId is required"), validateRequest],
  getPublicOrganizerProfileByUserId,
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["organizer"]),
  upload.single("license"),
  [
    body("businessName").trim().notEmpty().withMessage("Business name is required"),
    validateRequest,
  ],
  registerOrganizerProfile,
);
router.get("/me", authMiddleware, roleMiddleware(["organizer"]), getMyOrganizerProfile);
router.get(
  "/me/trips",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    query("q").optional().isString().withMessage("q must be a string"),
    query("status")
      .optional()
      .isIn(["active", "completed", "cancelled"])
      .withMessage("status must be active, completed, or cancelled"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "startDate", "pricePerPerson", "status"])
      .withMessage("sortBy must be createdAt, startDate, pricePerPerson, or status"),
    query("sortOrder").optional().isIn(["asc", "desc"]).withMessage("sortOrder must be asc or desc"),
    validateRequest,
  ],
  getMyOrganizerTrips,
);
router.get("/me/finance", authMiddleware, roleMiddleware(["organizer"]), getMyOrganizerFinance);
router.get(
  "/me/trips/:tripId/bookings",
  authMiddleware,
  roleMiddleware(["organizer"]),
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
router.get("/me/posts", authMiddleware, roleMiddleware(["organizer"]), getMyOrganizerPosts);
router.post(
  "/me/posts",
  authMiddleware,
  roleMiddleware(["organizer"]),
  uploadOrganizerMedia.array("media", 8),
  [body("caption").optional().isString().withMessage("caption must be text"), validateRequest],
  createOrganizerPost,
);
router.delete(
  "/me/posts/:postId",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [param("postId").isMongoId().withMessage("Valid postId is required"), validateRequest],
  deleteMyOrganizerPost,
);
router.get(
  "/:organizerId/follow-status",
  authMiddleware,
  [param("organizerId").isMongoId().withMessage("Valid organizer id is required"), validateRequest],
  getOrganizerFollowStatus,
);
router.post(
  "/:organizerId/follow",
  authMiddleware,
  [param("organizerId").isMongoId().withMessage("Valid organizer id is required"), validateRequest],
  followOrganizer,
);
router.delete(
  "/:organizerId/follow",
  authMiddleware,
  [param("organizerId").isMongoId().withMessage("Valid organizer id is required"), validateRequest],
  unfollowOrganizer,
);

module.exports = router;
