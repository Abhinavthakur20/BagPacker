const express = require("express");
const { param, query } = require("express-validator");
const { getRoomMessages } = require("../api/chat/chatController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/rooms/:roomId/messages",
  [
    param("roomId")
      .trim()
      .notEmpty()
      .isLength({ max: 200 })
      .withMessage("Valid roomId is required"),
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage("limit must be between 1 and 200"),
    validateRequest,
  ],
  getRoomMessages,
);

module.exports = router;
