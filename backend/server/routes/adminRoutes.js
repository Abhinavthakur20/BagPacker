const express = require("express");
const { body, param } = require("express-validator");
const {
  getAllUsers,
  getPendingOrganizers,
  getPendingVerifications,
  getReports,
  resolveReport,
  reviewOrganizerApproval,
  updateVerificationStatus,
} = require("../api/admin/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["admin"]));

router.get("/users", getAllUsers);
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
router.get("/reports", getReports);
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
