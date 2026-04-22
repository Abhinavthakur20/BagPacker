const express = require("express");
const { body } = require("express-validator");
const { askCopilot } = require("../api/ai/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/copilot",
  [
    body("intent")
      .optional()
      .isIn(["packing", "route", "safety", "qa"])
      .withMessage("intent must be packing, route, safety, or qa"),
    body("message")
      .trim()
      .isLength({ min: 2, max: 1200 })
      .withMessage("message must be between 2 and 1200 characters"),
    body("context").optional().isObject().withMessage("context must be an object"),
    validateRequest,
  ],
  askCopilot,
);

module.exports = router;
