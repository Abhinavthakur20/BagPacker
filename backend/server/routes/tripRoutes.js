const express = require("express");
const { body, param, query } = require("express-validator");
const {
  createTrip,
  deleteTrip,
  getTripById,
  getTrips,
  updateTrip,
} = require("../api/trip/tripController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();
const isNonEmptyArrayPayload = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch (_error) {
      return false;
    }
  }

  return false;
};

router.get(
  "/",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    validateRequest,
  ],
  getTrips,
);
router.get("/:id", [param("id").isMongoId().withMessage("Valid trip id is required"), validateRequest], getTripById);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["organizer"]),
  upload.array("tripImages", 10),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("source").trim().notEmpty().withMessage("Source is required"),
    body("destination").trim().notEmpty().withMessage("Destination is required"),
    body("startDate").isISO8601().withMessage("Valid startDate is required"),
    body("endDate").isISO8601().withMessage("Valid endDate is required"),
    body("pricePerPerson").isFloat({ min: 0 }).withMessage("Valid pricePerPerson is required"),
    body("totalSeats").isInt({ min: 1 }).withMessage("Valid totalSeats is required"),
    body("itinerary")
      .custom((value) => isNonEmptyArrayPayload(value))
      .withMessage("Itinerary must be a non-empty array"),
    body("pickupPoints")
      .custom((value) => isNonEmptyArrayPayload(value))
      .withMessage("pickupPoints must be a non-empty array"),
    validateRequest,
  ],
  createTrip,
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [param("id").isMongoId().withMessage("Valid trip id is required"), validateRequest],
  updateTrip,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [param("id").isMongoId().withMessage("Valid trip id is required"), validateRequest],
  deleteTrip,
);

module.exports = router;
