const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: errors.array().map((error) => error.msg).join(", "),
    errors: errors.array(),
  });
};

module.exports = validateRequest;
