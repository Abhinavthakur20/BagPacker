const express = require("express");
const { param, query } = require("express-validator");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../api/notification/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    query("isRead")
      .optional()
      .isIn(["true", "false"])
      .withMessage("isRead must be true or false"),
    validateRequest,
  ],
  getNotifications,
);
router.put(
  "/:id/read",
  [param("id").isMongoId().withMessage("Valid notification id is required"), validateRequest],
  markNotificationRead,
);
router.put("/read-all", markAllNotificationsRead);

module.exports = router;
