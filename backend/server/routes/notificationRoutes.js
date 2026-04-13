const express = require("express");
const { param } = require("express-validator");
const {
  getNotifications,
  markNotificationRead,
} = require("../api/notification/notificationController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.put(
  "/:id/read",
  [param("id").isMongoId().withMessage("Valid notification id is required"), validateRequest],
  markNotificationRead,
);

module.exports = router;
