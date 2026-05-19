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
  isEmailVerified: Boolean(user.isEmailVerified),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

module.exports = sanitizeUser;
