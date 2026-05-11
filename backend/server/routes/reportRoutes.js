const express = require("express");
const { body, query } = require("express-validator");
const { createReport, getMyReports } = require("../api/report/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  [
    body("reportedUserId").isMongoId().withMessage("Valid reportedUserId is required"),
    body("reason")
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage("reason must be between 10 and 1000 characters"),
    validateRequest,
  ],
  createReport,
);

const myReportsValidators = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["pending", "under_review", "resolved"])
    .withMessage("status is invalid"),
  validateRequest,
];

router.get(
  "/",
  myReportsValidators,
  getMyReports,
);
router.get(
  "/my",
  [
    ...myReportsValidators,
  ],
  getMyReports,
);

module.exports = router;
