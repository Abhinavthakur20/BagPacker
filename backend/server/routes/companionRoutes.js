const express = require("express");
const { body, param, query } = require("express-validator");
const {
  acceptCompanionRequest,
  createCompanionRequest,
  findCompanions,
  getMyCompanionRequests,
  getMyPersonalTripPosts,
  getUserCompanionRequests,
  listPersonalTripPosts,
  createPersonalTripPost,
  declineCompanionRequest,
  requestPersonalTripPost,
  respondToCompanionRequest,
  searchPersonalTripPosts,
  sendCompanionRequest,
} = require("../api/companion/companionController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware, roleMiddleware(["traveler"]));

const pagingValidators = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
];

const companionFilterValidators = [
  query("date").optional().isISO8601().withMessage("date must be a valid ISO8601 date"),
  query("seatsRequested")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("seatsRequested must be between 1 and 10"),
  query("genderPreference")
    .optional({ values: "falsy" })
    .isIn(["M", "F", "Any"])
    .withMessage("genderPreference must be M, F, or Any"),
  query("gender")
    .optional({ values: "falsy" })
    .isIn(["M", "F", "Any"])
    .withMessage("gender must be M, F, or Any"),
  query("vehicleType")
    .optional({ values: "falsy" })
    .isIn(["car", "bike"])
    .withMessage("vehicleType must be car or bike"),
  query("vehicle")
    .optional({ values: "falsy" })
    .isIn(["car", "bike"])
    .withMessage("vehicle must be car or bike"),
];

const companionRequestBodyValidators = [
  body("receiverId").optional().isMongoId().withMessage("Valid receiverId is required"),
  body("personalTripPostId").optional().isMongoId().withMessage("Valid personalTripPostId is required"),
  body("postId").optional().isMongoId().withMessage("Valid postId is required"),
  body("travelDate").optional().isISO8601().withMessage("Valid travelDate is required"),
  body("seatsRequested")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("seatsRequested must be between 1 and 10"),
  body("genderPreference")
    .optional({ values: "falsy" })
    .isIn(["M", "F", "Any"])
    .withMessage("genderPreference must be M, F, or Any"),
  body("vehicleType")
    .optional({ values: "falsy" })
    .isIn(["car", "bike"])
    .withMessage("vehicleType must be car or bike"),
];

router.get("/search", [...pagingValidators, ...companionFilterValidators, validateRequest], searchPersonalTripPosts);
router.get("/find", [...pagingValidators, validateRequest], findCompanions);
router.get("/posts", [...pagingValidators, ...companionFilterValidators, validateRequest], listPersonalTripPosts);
router.get("/posts/mine", [...pagingValidators, validateRequest], getMyPersonalTripPosts);
router.get(
  "/users/:userId/requests",
  [
    param("userId").isMongoId().withMessage("Valid user id is required"),
    ...pagingValidators,
    validateRequest,
  ],
  getUserCompanionRequests,
);
router.post("/", [...companionRequestBodyValidators, validateRequest], createCompanionRequest);
router.post(
  "/posts",
  [
    body("source").trim().notEmpty().withMessage("Source is required"),
    body("destination").trim().notEmpty().withMessage("Destination is required"),
    body("travelDate").isISO8601().withMessage("Valid travelDate is required"),
    body("maxCompanions")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("maxCompanions must be at least 1"),
    body("seatsAvailable")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("seatsAvailable must be at least 1"),
    body("genderPreference")
      .optional({ values: "falsy" })
      .isIn(["M", "F", "Any"])
      .withMessage("genderPreference must be M, F, or Any"),
    body("vehicleType")
      .optional({ values: "falsy" })
      .isIn(["car", "bike"])
      .withMessage("vehicleType must be car or bike"),
    body("sourceLatitude")
      .optional({ values: "falsy" })
      .isFloat({ min: -90, max: 90 })
      .withMessage("sourceLatitude must be between -90 and 90"),
    body("sourceLongitude")
      .optional({ values: "falsy" })
      .isFloat({ min: -180, max: 180 })
      .withMessage("sourceLongitude must be between -180 and 180"),
    body("destinationLatitude")
      .optional({ values: "falsy" })
      .isFloat({ min: -90, max: 90 })
      .withMessage("destinationLatitude must be between -90 and 90"),
    body("destinationLongitude")
      .optional({ values: "falsy" })
      .isFloat({ min: -180, max: 180 })
      .withMessage("destinationLongitude must be between -180 and 180"),
    body("fuelPricePerLitre")
      .optional({ values: "falsy" })
      .isFloat({ gt: 0 })
      .withMessage("fuelPricePerLitre must be greater than 0"),
    body("mileage")
      .optional({ values: "falsy" })
      .isFloat({ gt: 0 })
      .withMessage("mileage must be greater than 0"),
    body("tollAmount")
      .optional({ values: "falsy" })
      .isFloat({ min: 0 })
      .withMessage("tollAmount must be 0 or greater"),
    body("note").optional().isString().isLength({ max: 500 }).withMessage("Note is too long"),
    validateRequest,
  ],
  createPersonalTripPost,
);
router.post(
  "/posts/request",
  [
    body("postId").isMongoId().withMessage("Valid postId is required"),
    body("seatsRequested")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("seatsRequested must be between 1 and 10"),
    body("genderPreference")
      .optional({ values: "falsy" })
      .isIn(["M", "F", "Any"])
      .withMessage("genderPreference must be M, F, or Any"),
    body("vehicleType")
      .optional({ values: "falsy" })
      .isIn(["car", "bike"])
      .withMessage("vehicleType must be car or bike"),
    validateRequest,
  ],
  requestPersonalTripPost,
);
router.post(
  "/request",
  [
    ...companionRequestBodyValidators,
    body("receiverId").isMongoId().withMessage("Valid receiverId is required"),
    body("source").trim().notEmpty().withMessage("Source is required"),
    body("destination").trim().notEmpty().withMessage("Destination is required"),
    body("travelDate").isISO8601().withMessage("Valid travelDate is required"),
    validateRequest,
  ],
  sendCompanionRequest,
);
router.patch(
  "/:id/accept",
  [param("id").isMongoId().withMessage("Valid companion request id is required"), validateRequest],
  acceptCompanionRequest,
);
router.patch(
  "/:id/decline",
  [param("id").isMongoId().withMessage("Valid companion request id is required"), validateRequest],
  declineCompanionRequest,
);
router.put(
  "/:id/respond",
  [
    param("id").isMongoId().withMessage("Valid companion request id is required"),
    body("status").isIn(["accepted", "declined"]).withMessage("Status must be accepted or declined"),
    validateRequest,
  ],
  respondToCompanionRequest,
);
router.get("/my", [...pagingValidators, validateRequest], getMyCompanionRequests);

module.exports = router;
