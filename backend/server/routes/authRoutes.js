const express = require("express");
const {
  getUsers,
  registerUser,
  loginUser,
} = require("../api/user/userController");


const router = express.Router();

router.get("/users", getUsers);
router.post("/users/register", registerUser);
router.post("/users/login", loginUser);



module.exports = router;
