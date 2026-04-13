const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../user/userModel");

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  verificationStatus: user.verificationStatus,
  governmentIdUrl: user.governmentIdUrl,
  trustScore: user.trustScore,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === normalizedEmail
            ? "Email is already registered"
            : "Phone is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedRole = ["traveler", "organizer"].includes(role) ? role : "traveler";

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: normalizedRole,
    });

    return res.status(201).json({
      token: generateToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      token: generateToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
};
