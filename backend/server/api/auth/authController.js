const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../user/userModel");
const { recalculateAndPersistTrustScore } = require("../user/trustScoreService");

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

const sanitizeGooglePayload = (payload) => ({
  email: payload.email.toLowerCase().trim(),
  name: payload.name.trim(),
  sub: payload.sub,
  picture: payload.picture || null,
});

const getFallbackPhone = (googleSub) => `google-${googleSub.slice(-10)}`;

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  authProvider: user.authProvider,
  avatarUrl: user.avatarUrl,
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
      authProvider: "local",
    });
    const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
    if (trustResult) {
      user.trustScore = trustResult.trustScore;
    }

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

    if (!user.passwordHash) {
      return res
        .status(401)
        .json({ message: "This account uses Google sign-in. Continue with Google." });
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Reject banned or suspended accounts before issuing a token
    if (user.verificationStatus === "rejected" || user.isBanned) {
      return res.status(403).json({ message: "This account has been suspended. Please contact support." });
    }

    return res.status(200).json({
      token: generateToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const googleAuth = async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(503).json({ message: "Google sign-in is not configured" });
    }

    const credential = typeof req.body.credential === "string" ? req.body.credential : "";
    if (!credential.trim()) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload?.name || !payload?.sub) {
      return res.status(400).json({ message: "Invalid Google account payload" });
    }

    const googlePayload = sanitizeGooglePayload(payload);
    const normalizedRole = ["traveler", "organizer"].includes(req.body.role)
      ? req.body.role
      : "traveler";

    let user = await User.findOne({ email: googlePayload.email });

    if (!user) {
      user = await User.create({
        name: googlePayload.name,
        email: googlePayload.email,
        role: normalizedRole,
        phone: getFallbackPhone(googlePayload.sub),
        passwordHash: null,
        authProvider: "google",
        googleId: googlePayload.sub,
        avatarUrl: googlePayload.picture,
      });
      const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
      if (trustResult) {
        user.trustScore = trustResult.trustScore;
      }
    } else {
      const shouldUpdate = {};
      if (!user.phone) shouldUpdate.phone = getFallbackPhone(googlePayload.sub);
      if (!user.googleId) shouldUpdate.googleId = googlePayload.sub;
      if (user.authProvider !== "google") shouldUpdate.authProvider = "google";
      if (!user.avatarUrl && googlePayload.picture) shouldUpdate.avatarUrl = googlePayload.picture;

      if (Object.keys(shouldUpdate).length) {
        user = await User.findByIdAndUpdate(user._id, shouldUpdate, {
          returnDocument: "after",
          runValidators: true,
        });
        const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
        if (trustResult) {
          user.trustScore = trustResult.trustScore;
        }
      } else {
        const trustResult = await recalculateAndPersistTrustScore(user._id, { userDoc: user });
        if (trustResult) {
          user.trustScore = trustResult.trustScore;
        }
      }
    }

    return res.status(200).json({
      token: generateToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(401).json({ message: "Google authentication failed" });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
};
