const mongoose = require("mongoose");
const User = require("./userModel");
const Organizer = require("../organizer/organizerModel");
const Review = require("../review/reviewModel");

const TRUST_SCORE_PROFILE_WEIGHT = 60;
const TRUST_SCORE_REVIEW_WEIGHT = 40;
const REVIEW_VOLUME_BENCHMARK = 10;

const hasText = (value) => Boolean(String(value || "").trim());

const getVerificationFactor = (verificationStatus) => {
  if (verificationStatus === "verified") return 1;
  if (verificationStatus === "pending") return 0.5;
  return 0;
};

const getApprovalFactor = (approvalStatus) => {
  if (approvalStatus === "approved") return 1;
  if (approvalStatus === "pending") return 0.35;
  return 0;
};

const computeTravelerProfileRatio = (user) => {
  const checks = [
    { weight: 1.2, score: hasText(user?.name) ? 1 : 0 },
    { weight: 1.2, score: hasText(user?.email) ? 1 : 0 },
    { weight: 1.6, score: hasText(user?.phone) ? 1 : 0 },
    { weight: 1.2, score: hasText(user?.avatarUrl) ? 1 : 0 },
    { weight: 1.3, score: hasText(user?.governmentIdUrl) ? 1 : 0 },
    { weight: 1.5, score: getVerificationFactor(user?.verificationStatus) },
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const achieved = checks.reduce((sum, check) => sum + (check.weight * check.score), 0);
  return totalWeight > 0 ? achieved / totalWeight : 0;
};

const computeOrganizerProfileRatio = (user, organizer) => {
  const checks = [
    { weight: 0.8, score: hasText(user?.name) ? 1 : 0 },
    { weight: 0.8, score: hasText(user?.email) ? 1 : 0 },
    { weight: 1.1, score: hasText(user?.phone) ? 1 : 0 },
    { weight: 0.9, score: hasText(user?.avatarUrl) ? 1 : 0 },
    { weight: 1.1, score: hasText(user?.governmentIdUrl) ? 1 : 0 },
    { weight: 1.6, score: getVerificationFactor(user?.verificationStatus) },
    { weight: 2.2, score: hasText(organizer?.businessName) ? 1 : 0 },
    { weight: 1.1, score: hasText(organizer?.gstNumber) ? 1 : 0 },
    { weight: 1.2, score: hasText(organizer?.licenseUrl) ? 1 : 0 },
    { weight: 1.2, score: hasText(organizer?.bankAccountDetails) ? 1 : 0 },
    { weight: 1.8, score: getApprovalFactor(organizer?.approvalStatus) },
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const achieved = checks.reduce((sum, check) => sum + (check.weight * check.score), 0);
  return totalWeight > 0 ? achieved / totalWeight : 0;
};

const computeReviewScore = ({ averageRating, reviewCount }) => {
  const normalizedRating = Math.max(0, Math.min(5, Number(averageRating || 0)));
  const normalizedCount = Math.max(0, Number(reviewCount || 0));
  const ratingFactor = normalizedRating / 5;
  const volumeFactor = Math.min(normalizedCount, REVIEW_VOLUME_BENCHMARK) / REVIEW_VOLUME_BENCHMARK;
  const combinedFactor = (ratingFactor * 0.8) + (volumeFactor * 0.2);
  return combinedFactor * TRUST_SCORE_REVIEW_WEIGHT;
};

const getReviewStats = async (userId) => {
  const [stats] = await Review.aggregate([
    {
      $match: {
        revieweeId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$revieweeId",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  return {
    averageRating: Number(stats?.averageRating || 0),
    reviewCount: Number(stats?.reviewCount || 0),
  };
};

const recalculateAndPersistTrustScore = async (
  userId,
  { userDoc = null, organizerDoc = null } = {},
) => {
  const user = userDoc
    ? (userDoc.toObject ? userDoc.toObject() : userDoc)
    : await User.findById(userId).lean();

  if (!user?._id) {
    return null;
  }

  let organizer = organizerDoc
    ? (organizerDoc.toObject ? organizerDoc.toObject() : organizerDoc)
    : null;

  if (!organizer && user.role === "organizer") {
    organizer = await Organizer.findOne({ userId: user._id }).lean();
  }

  const reviewStats = await getReviewStats(user._id);
  const profileRatio = user.role === "organizer"
    ? computeOrganizerProfileRatio(user, organizer)
    : computeTravelerProfileRatio(user);

  const profileScore = profileRatio * TRUST_SCORE_PROFILE_WEIGHT;
  const reviewScore = computeReviewScore(reviewStats);
  const trustScore = Number(
    Math.max(0, Math.min(100, profileScore + reviewScore)).toFixed(2),
  );

  await User.findByIdAndUpdate(user._id, { trustScore }, { runValidators: true });

  return {
    trustScore,
    profileScore: Number(profileScore.toFixed(2)),
    reviewScore: Number(reviewScore.toFixed(2)),
    reviewCount: reviewStats.reviewCount,
    averageRating: Number(reviewStats.averageRating.toFixed(2)),
  };
};

module.exports = {
  recalculateAndPersistTrustScore,
};
