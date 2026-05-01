const express = require("express");
const { body, param, query } = require("express-validator");
const {
  cancelBooking,
  completeBooking,
  initiateBookingPayment,
  getMyBookings,
  verifyBookingPayment,
} = require("../api/booking/bookingController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["traveler"]));

router.post(
  "/initiate-payment",
  [
    body("tripId").isMongoId().withMessage("Valid tripId is required"),
    body("pickupPointId").isMongoId().withMessage("Valid pickupPointId is required"),
    body("seatsBooked").isInt({ min: 1 }).withMessage("seatsBooked must be at least 1"),
    validateRequest,
  ],
  initiateBookingPayment,
);
router.post(
  "/verify-payment",
  [
    body("bookingId").isMongoId().withMessage("Valid bookingId is required"),
    body("razorpay_order_id").trim().notEmpty().withMessage("razorpay_order_id is required"),
    body("razorpay_payment_id").trim().notEmpty().withMessage("razorpay_payment_id is required"),
    body("razorpay_signature").trim().notEmpty().withMessage("razorpay_signature is required"),
    validateRequest,
  ],
  verifyBookingPayment,
);
router.get(
  "/my",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("limit must be between 1 and 100"),
    validateRequest,
  ],
  getMyBookings,
);
router.put(
  "/:id/cancel",
  [param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest],
  cancelBooking,
);
router.put(
  "/:id/complete",
  [authMiddleware, roleMiddleware(["organizer"]), param("id").isMongoId().withMessage("Valid booking id is required"), validateRequest],
  completeBooking,
);

module.exports = router;
