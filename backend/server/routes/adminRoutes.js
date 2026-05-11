const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getAllUsers,
  getPendingOrganizers,
  getPendingVerifications,
  getPaymentMonitor,
  getReviewsOverview,
  getTripListings,
  getJoinActivity,
  getReports,
  resolveReport,
  reviewOrganizerApproval,
  updateTripLifecycle,
  updateVerificationStatus,
  toggleUserBan,
  recalculateAllTrustScores,
} = require("../api/admin/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["admin"]));

router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    validateRequest,
  ],
  getAllUsers,
);
router.put(
  "/users/:id/toggle-ban",
  [param("id").isMongoId().withMessage("Valid user id is required"), validateRequest],
  toggleUserBan,
);
router.post("/trust-scores/recalculate", recalculateAllTrustScores);
router.get("/organizers/pending", getPendingOrganizers);
router.put(
  "/organizers/:id/approve",
  [
    param("id").isMongoId().withMessage("Valid organizer id is required"),
    body("approvalStatus")
      .isIn(["approved", "rejected"])
      .withMessage("approvalStatus must be approved or rejected"),
    validateRequest,
  ],
  reviewOrganizerApproval,
);
router.get("/verifications/pending", getPendingVerifications);
router.put(
  "/verifications/:id",
  [
    param("id").isMongoId().withMessage("Valid user id is required"),
    body("verificationStatus")
      .isIn(["verified", "rejected"])
      .withMessage("verificationStatus must be verified or rejected"),
    validateRequest,
  ],
  updateVerificationStatus,
);
router.get(
  "/reports",
  [
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
  ],
  getReports,
);
router.get(
  "/trip-listings",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["active", "completed", "cancelled"])
      .withMessage("status is invalid"),
    query("paymentEnabled")
      .optional()
      .isBoolean()
      .withMessage("paymentEnabled must be true or false"),
    query("transportType")
      .optional()
      .isIn(["bus", "car", "tempo_traveller", "train", "flight", "other"])
      .withMessage("transportType is invalid"),
    validateRequest,
  ],
  getTripListings,
);
router.put(
  "/trip-listings/:id/lifecycle",
  [
    param("id").isMongoId().withMessage("Valid trip id is required"),
    body("action")
      .isIn(["start", "complete", "cancel", "activate"])
      .withMessage("action is invalid"),
    validateRequest,
  ],
  updateTripLifecycle,
);
router.get(
  "/payments",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    query("paymentStatus")
      .optional()
      .isIn(["created", "paid", "failed", "refund_required", "refunded"])
      .withMessage("paymentStatus is invalid"),
    query("status")
      .optional()
      .isIn(["pending", "confirmed", "cancelled", "completed"])
      .withMessage("status is invalid"),
    validateRequest,
  ],
  getPaymentMonitor,
);
router.get("/join-activity", getJoinActivity);
router.get(
  "/reviews",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    validateRequest,
  ],
  getReviewsOverview,
);
router.put(
  "/reports/:id/resolve",
  [
    param("id").isMongoId().withMessage("Valid report id is required"),
    body("adminAction")
      .isIn(["warning", "suspension", "ban", "dismissed"])
      .withMessage("adminAction is invalid"),
    validateRequest,
  ],
  resolveReport,
);

module.exports = router;
