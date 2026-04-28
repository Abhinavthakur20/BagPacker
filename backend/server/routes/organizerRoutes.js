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
router.get("/me/trips", authMiddleware, roleMiddleware(["organizer"]), getMyOrganizerTrips);
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
