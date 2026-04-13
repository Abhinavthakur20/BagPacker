const express = require("express");
const { param } = require("express-validator");
const {
  getMyTripGroups,
  removeMemberFromTripGroup,
} = require("../api/groupChat/groupChatController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.use(authMiddleware);

router.get("/my", getMyTripGroups);
router.put(
  "/:groupId/members/:memberUserId/remove",
  [
    param("groupId").isMongoId().withMessage("Valid groupId is required"),
    param("memberUserId").isMongoId().withMessage("Valid memberUserId is required"),
    validateRequest,
  ],
  removeMemberFromTripGroup,
);

module.exports = router;
