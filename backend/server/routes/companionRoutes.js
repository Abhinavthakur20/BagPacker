const express = require("express");
const { body, param } = require("express-validator");
const {
  findCompanions,
  getMyCompanionRequests,
  getMyPersonalTripPosts,
  listPersonalTripPosts,
  createPersonalTripPost,
  requestPersonalTripPost,
  respondToCompanionRequest,
  sendCompanionRequest,
} = require("../api/companion/companionController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["traveler"]));

router.get("/find", findCompanions);
router.get("/posts", listPersonalTripPosts);
router.get("/posts/mine", getMyPersonalTripPosts);
router.post(
  "/posts",
  [
    body("source").trim().notEmpty().withMessage("Source is required"),
    body("destination").trim().notEmpty().withMessage("Destination is required"),
    body("travelDate").isISO8601().withMessage("Valid travelDate is required"),
    body("maxCompanions")
      .isInt({ min: 2, max: 3 })
      .withMessage("maxCompanions must be between 2 and 3"),
    body("note").optional().isString().isLength({ max: 500 }).withMessage("Note is too long"),
    validateRequest,
  ],
  createPersonalTripPost,
);
router.post(
  "/posts/request",
  [
    body("postId").isMongoId().withMessage("Valid postId is required"),
    validateRequest,
  ],
  requestPersonalTripPost,
);
router.post(
  "/request",
  [
    body("receiverId").isMongoId().withMessage("Valid receiverId is required"),
    body("source").trim().notEmpty().withMessage("Source is required"),
    body("destination").trim().notEmpty().withMessage("Destination is required"),
    body("travelDate").isISO8601().withMessage("Valid travelDate is required"),
    validateRequest,
  ],
  sendCompanionRequest,
);
router.put(
  "/:id/respond",
  [
    param("id").isMongoId().withMessage("Valid companion request id is required"),
    body("status").isIn(["accepted", "declined"]).withMessage("Status must be accepted or declined"),
    validateRequest,
  ],
  respondToCompanionRequest,
);
router.get("/my", getMyCompanionRequests);

module.exports = router;
