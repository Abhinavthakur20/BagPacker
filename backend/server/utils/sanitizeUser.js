/**
 * Sanitizes a user object by selecting only safe, public/non-sensitive fields.
 *
 * @param {Object} user - The Mongoose or raw user object to sanitize.
 * @returns {Object|null} The sanitized user object, or null if no user is provided.
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  return {
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
    isEmailVerified: Boolean(user.isEmailVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = sanitizeUser;
