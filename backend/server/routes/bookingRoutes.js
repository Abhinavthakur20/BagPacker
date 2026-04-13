const express = require("express");
const { body, param } = require("express-validator");
const {
  cancelBooking,
  completeBooking,
  createBooking,
  getMyBookings,
} = require("../api/booking/bookingController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  [
    body("tripId").isMongoId().withMessage("Valid tripId is required"),
    body("pickupPointId").isMongoId().withMessage("Valid pickupPointId is required"),
    body("seatsBooked").isInt({ min: 1 }).withMessage("seatsBooked must be at least 1"),
    validateRequest,
  ],
  createBooking,
);
router.get("/my", getMyBookings);
router.put(
  "/:id/cancel",
  [param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest],
  cancelBooking,
);
router.put(
  "/:id/complete",
  [param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest],
  completeBooking,
);

module.exports = router;
