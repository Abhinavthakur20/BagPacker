const express = require("express");
const { body } = require("express-validator");
const { askCopilot, generateTripAutofill } = require("../api/ai/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
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

router.post(
  "/trip-autofill",
  [
    body("source")
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("source must be between 2 and 120 characters"),
    body("destination")
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage("destination must be between 2 and 120 characters"),
    body("context").optional().isObject().withMessage("context must be an object"),
    validateRequest,
  ],
  roleMiddleware(["organizer"]),
  generateTripAutofill,
);

module.exports = router;
