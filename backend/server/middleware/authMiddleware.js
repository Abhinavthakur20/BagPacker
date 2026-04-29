const jwt = require("jsonwebtoken");
const User = require("../api/user/userModel");

const AUTH_USER_CACHE_TTL_MS = 30 * 1000;
const authUserCache = new Map();

const getCachedUser = (userId) => {
  const cacheEntry = authUserCache.get(String(userId));
  if (!cacheEntry) {
    return null;
  }

  if (cacheEntry.expiresAt <= Date.now()) {
    authUserCache.delete(String(userId));
    return null;
  }

  return cacheEntry.user;
};

const setCachedUser = (user) => {
  authUserCache.set(String(user._id), {
    user,
    expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
  });
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token is required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cachedUser = getCachedUser(decoded.id);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    const user = await User.findById(decoded.id).select("-passwordHash").lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid authorization token" });
    }

    setCachedUser(user);
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid authorization token" });
  }
};

module.exports = authMiddleware;
