const express = require("express");
const { body, param, query } = require("express-validator");
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
  [
    param("userId").isMongoId().withMessage("Valid user id is required"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    validateRequest,
  ],
  getReviewsForUser,
);

module.exports = router;
