const { buildCopilotPrompt, callGroqCopilot } = require("./aiService");

const normalizeIntent = (value) => {
  const normalized = String(value || "qa").trim().toLowerCase();
  if (["packing", "route", "safety", "qa"].includes(normalized)) {
    return normalized;
  }
  return "qa";
};

const safeText = (value, maxLength = 300) => String(value || "").trim().slice(0, maxLength);

const sanitizeMessageItems = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-12)
    .map((item) => ({
      sender: safeText(item?.sender || "", 20),
      text: safeText(item?.text || "", 500),
      time: safeText(item?.time || "", 32),
    }))
    .filter((item) => item.text);
};

const sanitizeChatSummaries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((item) => ({
      name: safeText(item?.name || "", 80),
      route: safeText(item?.route || "", 120),
      type: safeText(item?.type || "", 32),
    }))
    .filter((item) => item.name || item.route);
};

const buildContextSummary = (context = {}) => {
  const safeContext = typeof context === "object" && context !== null ? context : {};
  return {
    source: safeText(safeContext.source, 120),
    destination: safeText(safeContext.destination, 120),
    travelDate: safeText(safeContext.travelDate, 48),
    seatsRequested: Number(safeContext.seatsRequested || 0) || undefined,
    vehicleType: safeText(safeContext.vehicleType, 32),
    genderPreference: safeText(safeContext.genderPreference, 16),
    companionName: safeText(safeContext.companionName, 80),
    roomLabel: safeText(safeContext.roomLabel, 120),
    note: safeText(safeContext.note, 600),
    activeRoomType: safeText(safeContext.activeRoomType, 40),
    activeRoute: safeText(safeContext.activeRoute, 140),
    timezone: safeText(safeContext.timezone, 64),
    localeTime: safeText(safeContext.localeTime, 64),
    recentConversation: sanitizeMessageItems(safeContext.recentConversation),
    recentRoomMessages: sanitizeMessageItems(safeContext.recentRoomMessages),
    connectedChats: sanitizeChatSummaries(safeContext.connectedChats),
  };
};

const askCopilot = async (req, res) => {
  try {
    const intent = normalizeIntent(req.body.intent);
    const message = String(req.body.message || "").trim();
    const context = buildContextSummary(req.body.context);

    if (!message) {
      return res.status(400).json({ message: "Prompt message is required" });
    }

    const prompt = buildCopilotPrompt({
      intent,
      message,
      context,
      userName: req.user?.name || "Traveler",
      userProfile: {
        role: safeText(req.user?.role || "traveler", 20),
        trustScore: Number(req.user?.trustScore || 0),
        verificationStatus: safeText(req.user?.verificationStatus || "", 30),
      },
    });
    const answer = await callGroqCopilot(prompt);

    return res.status(200).json({
      intent,
      answer,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Copilot response failed" });
  }
};

module.exports = {
  askCopilot,
};
