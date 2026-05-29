const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const Organizer = require("../organizer/organizerModel");
const User = require("../user/userModel");
const { recalculateAndPersistTrustScore } = require("../user/trustScoreService");
const { sendMail } = require("../../utils/mailer");
const sanitizeUser = require("../../utils/sanitizeUser");

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
const normalizePhone = (phone) => String(phone || "").trim().replace(/[\s()-]/g, "");

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const createRawToken = () => crypto.randomBytes(32).toString("hex");
const getClientUrl = () => String(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
const getRequestedRole = (role) => (role === "organizer" ? "organizer" : "traveler");

const createOrganizerProfileForUser = async ({ userId, businessName, businessDesc }) => {
  const normalizedBusinessName = String(businessName || "").trim();
  if (!normalizedBusinessName) {
    throw new Error("Business name is required for organizer signup");
  }

  return Organizer.create({
    userId,
    businessName: normalizedBusinessName,
    businessDesc: String(businessDesc || "").trim(),
  });
};

const sendVerificationEmail = async (user) => {
  const token = createRawToken();
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verifyUrl = `${getClientUrl()}/auth/verify-email?token=${token}`;
  return sendMail({
    to: user.email,
    subject: "Verify your BagPacker email",
    text: `Verify your BagPacker email by opening this link: ${verifyUrl}`,
    html: `<p>Verify your BagPacker email by opening this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password, businessName, businessDesc } = req.body;
    const requestedRole = getRequestedRole(req.body.role);

    const normalizedEmail = email.toLowerCase().trim();
    const rawPhone = phone.trim();
    const normalizedPhone = normalizePhone(phone);
    const phoneCandidates = [...new Set([rawPhone, normalizedPhone].filter(Boolean))];

    const existingEmailUser = await User.findOne({ email: normalizedEmail }).select("_id");
    if (existingEmailUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const existingPhoneUser = await User.findOne({ phone: { $in: phoneCandidates } }).select("_id");
    if (existingPhoneUser) {
      return res.status(400).json({ message: "Phone is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: requestedRole,
      authProvider: "local",
    });

    let organizer = null;
    try {
      if (requestedRole === "organizer") {
        organizer = await createOrganizerProfileForUser({
          userId: user._id,
          businessName,
          businessDesc,
        });
      }
    } catch (profileError) {
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({ message: profileError.message });
    }

    const trustResult = await recalculateAndPersistTrustScore(user._id, {
      userDoc: user,
      organizerDoc: organizer,
    });
    if (trustResult) {
      user.trustScore = trustResult.trustScore;
    }

    let emailVerification = { delivered: false, skipped: true, reason: "Not attempted" };
    try {
      emailVerification = await sendVerificationEmail(user);
    } catch (mailError) {
      emailVerification = {
        delivered: false,
        skipped: false,
        reason: String(mailError?.message || "Email verification delivery failed"),
      };
    }

    return res.status(201).json({
      token: generateToken(user),
      user: sanitizeUser(user),
      emailVerification,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0];
      if (duplicateField === "email") {
        return res.status(400).json({ message: "Email is already registered" });
      }
      if (duplicateField === "phone") {
        return res.status(400).json({ message: "Phone is already registered" });
      }
    }
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
    const requestedRole = getRequestedRole(req.body.role);
    const requestedBusinessName = String(req.body.businessName || "").trim();
    const requestedBusinessDesc = String(req.body.businessDesc || "").trim();
    if (requestedRole === "organizer" && !requestedBusinessName) {
      return res.status(400).json({ message: "Business name is required for organizer signup" });
    }

    let user = await User.findOne({ email: googlePayload.email });
    let organizer = null;

    if (!user) {
      user = await User.create({
        name: googlePayload.name,
        email: googlePayload.email,
        role: requestedRole,
        phone: getFallbackPhone(googlePayload.sub),
        passwordHash: null,
        authProvider: "google",
        googleId: googlePayload.sub,
        avatarUrl: googlePayload.picture,
        isEmailVerified: Boolean(payload.email_verified),
      });
      if (requestedRole === "organizer") {
        try {
          organizer = await createOrganizerProfileForUser({
            userId: user._id,
            businessName: requestedBusinessName,
            businessDesc: requestedBusinessDesc,
          });
        } catch (profileError) {
          await User.deleteOne({ _id: user._id });
          return res.status(400).json({ message: profileError.message });
        }
      }
      const trustResult = await recalculateAndPersistTrustScore(user._id, {
        userDoc: user,
        organizerDoc: organizer,
      });
      if (trustResult) {
        user.trustScore = trustResult.trustScore;
      }
    } else {
      if (user.verificationStatus === "rejected" || user.isBanned) {
        return res.status(403).json({ message: "This account has been suspended. Please contact support." });
      }

      const shouldUpdate = {};
      if (!user.phone) shouldUpdate.phone = getFallbackPhone(googlePayload.sub);
      if (!user.googleId) shouldUpdate.googleId = googlePayload.sub;
      if (user.authProvider !== "google") shouldUpdate.authProvider = "google";
      if (!user.avatarUrl && googlePayload.picture) shouldUpdate.avatarUrl = googlePayload.picture;
      if (payload.email_verified && !user.isEmailVerified) shouldUpdate.isEmailVerified = true;
      if (requestedRole === "organizer" && user.role !== "organizer") shouldUpdate.role = "organizer";

      if (requestedRole === "organizer") {
        organizer = await Organizer.findOne({ userId: user._id });
        if (!organizer) {
          organizer = await createOrganizerProfileForUser({
            userId: user._id,
            businessName: requestedBusinessName,
            businessDesc: requestedBusinessDesc,
          });
        }
      }

      if (Object.keys(shouldUpdate).length) {
        user = await User.findByIdAndUpdate(user._id, shouldUpdate, {
          returnDocument: "after",
          runValidators: true,
        });
        const trustResult = await recalculateAndPersistTrustScore(user._id, {
          userDoc: user,
          organizerDoc: organizer,
        });
        if (trustResult) {
          user.trustScore = trustResult.trustScore;
        }
      } else {
        const trustResult = await recalculateAndPersistTrustScore(user._id, {
          userDoc: user,
          organizerDoc: organizer,
        });
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

const forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "").toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && user.passwordHash && !user.isBanned && user.verificationStatus !== "rejected") {
      const token = createRawToken();
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = `${getClientUrl()}/auth/reset-password?token=${token}`;
      await sendMail({
        to: user.email,
        subject: "Reset your BagPacker password",
        text: `Reset your BagPacker password by opening this link: ${resetUrl}`,
        html: `<p>Reset your BagPacker password by opening this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    }

    return res.status(200).json({
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset link is invalid or expired" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = String(req.body.token || req.query.token || "").trim();
    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Email verification link is invalid or expired" });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  register,
  login,
  googleAuth,
  verifyEmail,
};
