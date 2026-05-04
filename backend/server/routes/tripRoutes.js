const express = require("express");
const { body, param, query } = require("express-validator");
const {
  createTrip,
  deleteTrip,
  getCitySuggestions,
  getTripById,
  getTrips,
  startTrip,
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
  "/cities/suggestions",
  [
    query("q")
      .optional()
      .isString()
      .withMessage("q must be a string"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("limit must be between 1 and 20"),
    validateRequest,
  ],
  getCitySuggestions,
);

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
    query("transportType")
      .optional()
      .isIn(["bus", "car", "tempo_traveller", "train", "flight", "other"])
      .withMessage("transportType is invalid"),
    query("paymentEnabled")
      .optional()
      .isBoolean()
      .withMessage("paymentEnabled must be true or false"),
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
    body("transportType")
      .optional()
      .isIn(["bus", "car", "tempo_traveller", "train", "flight", "other"])
      .withMessage("transportType is invalid"),
    body("paymentEnabled")
      .optional()
      .isBoolean()
      .withMessage("paymentEnabled must be true or false"),
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
  [
    param("id").isMongoId().withMessage("Valid trip id is required"),
    body("title").optional().trim().notEmpty().withMessage("Title is required"),
    body("source").optional().trim().notEmpty().withMessage("Source is required"),
    body("destination").optional().trim().notEmpty().withMessage("Destination is required"),
    body("startDate").optional().isISO8601().withMessage("Valid startDate is required"),
    body("endDate").optional().isISO8601().withMessage("Valid endDate is required"),
    body("pricePerPerson").optional().isFloat({ min: 0 }).withMessage("Valid pricePerPerson is required"),
    body("totalSeats").optional().isInt({ min: 1 }).withMessage("Valid totalSeats is required"),
    body("transportType")
      .optional()
      .isIn(["bus", "car", "tempo_traveller", "train", "flight", "other"])
      .withMessage("transportType is invalid"),
    body("paymentEnabled")
      .optional()
      .isBoolean()
      .withMessage("paymentEnabled must be true or false"),
    body("status")
      .optional()
      .isIn(["active", "completed", "cancelled"])
      .withMessage("Valid status is required"),
    body("itinerary")
      .optional()
      .custom((value) => isNonEmptyArrayPayload(value))
      .withMessage("Itinerary must be a non-empty array"),
    body("pickupPoints")
      .optional()
      .custom((value) => isNonEmptyArrayPayload(value))
      .withMessage("pickupPoints must be a non-empty array"),
    validateRequest,
  ],
  updateTrip,
);
router.put(
  "/:id/start",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [param("id").isMongoId().withMessage("Valid trip id is required"), validateRequest],
  startTrip,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["organizer"]),
  [param("id").isMongoId().withMessage("Valid trip id is required"), validateRequest],
  deleteTrip,
);

module.exports = router;
