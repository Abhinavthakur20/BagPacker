const express = require("express");
const { body } = require("express-validator");
const {
  forgotPassword,
  googleAuth,
  login,
  register,
  resetPassword,
  verifyEmail,
} = require("../api/auth/authController");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("role")
      .optional()
      .isIn(["traveler", "organizer"])
      .withMessage("Valid role is required"),
    body("businessName")
      .if(body("role").equals("organizer"))
      .trim()
      .notEmpty()
      .withMessage("Business name is required for organizer signup"),
    body("businessDesc").optional().isString().withMessage("Business description must be text"),
    validateRequest,
  ],
  register,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validateRequest,
  ],
  login,
);

router.post(
  "/google",
  [
    body("credential").trim().notEmpty().withMessage("Google credential is required"),
    body("role")
      .optional()
      .isIn(["traveler", "organizer"])
      .withMessage("Valid role is required"),
    validateRequest,
  ],
  googleAuth,
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required"), validateRequest],
  forgotPassword,
);

router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    validateRequest,
  ],
  resetPassword,
);

router.post(
  "/verify-email",
  [body("token").trim().notEmpty().withMessage("Verification token is required"), validateRequest],
  verifyEmail,
);

module.exports = router;
