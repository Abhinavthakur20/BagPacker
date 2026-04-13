const express = require("express");
const { body, param } = require("express-validator");
const { createReview, getReviewsForUser } = require("../api/review/reviewController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  [
    body("revieweeId").isMongoId().withMessage("Valid revieweeId is required"),
    body("bookingId").isMongoId().withMessage("Valid bookingId is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    validateRequest,
  ],
  createReview,
);
router.get(
  "/:userId",
  [param("userId").isMongoId().withMessage("Valid user id is required"), validateRequest],
  getReviewsForUser,
);

module.exports = router;
