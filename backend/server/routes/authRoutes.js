const express = require("express");
const { body } = require("express-validator");
const { login, register } = require("../api/auth/authController");
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

module.exports = router;
