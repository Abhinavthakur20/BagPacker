const express = require("express");
const { body, param } = require("express-validator");
const {
  findCompanions,
  getMyCompanionRequests,
  respondToCompanionRequest,
  sendCompanionRequest,
} = require("../api/companion/companionController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.get("/find", findCompanions);
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
