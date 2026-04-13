const express = require("express");
const { param } = require("express-validator");
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
    validateRequest,
  ],
  getRoomMessages,
);

module.exports = router;
