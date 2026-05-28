const { buildCopilotPrompt, buildTripAutofillPrompt, callGroqCopilot, extractTripSearchFilters } = require("./aiService");
const Trip = require("../trip/tripModel");
const { escapeRegex } = require("../../utils/text");

const normalizeIntent = (value) => {
  const normalized = String(value || "qa").trim().toLowerCase();
  if (["packing", "route", "safety", "qa"].includes(normalized)) {
    return normalized;
  }
  return "qa";
};

const safeText = (value, maxLength = 300) => String(value || "").trim().slice(0, maxLength);
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

    let suggestedTrips = [];
    try {
      const searchFilters = await extractTripSearchFilters(message);
      if (searchFilters?.isSearch) {
        const query = { status: "active", availableSeats: { $gt: 0 } };
        if (searchFilters.destination) {
          query.destination = new RegExp(escapeRegex(searchFilters.destination), "i");
        }
        if (searchFilters.maxBudget && typeof searchFilters.maxBudget === "number") {
          query.pricePerPerson = { $lte: searchFilters.maxBudget };
        }

        const trips = await Trip.find(query).sort({ startDate: 1 }).limit(3).lean();

        suggestedTrips = trips.map((t) => ({
          _id: String(t._id),
          title: String(t.title),
          destination: String(t.destination),
          pricePerPerson: Number(t.pricePerPerson),
          startDate: t.startDate,
          duration:
            Math.max(
              1,
              Math.ceil((new Date(t.endDate) - new Date(t.startDate)) / (1000 * 60 * 60 * 24)),
            ) + " Days",
          image: Array.isArray(t.images) && t.images.length > 0 ? t.images[0] : null,
        }));
      }
    } catch (_error) {
      suggestedTrips = [];
    }

    if (suggestedTrips.length > 0) {
      context.foundTrips = suggestedTrips.map((t) => ({ title: t.title, price: t.pricePerPerson }));
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
      suggestedTrips
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Copilot response failed" });
  }
};

const parseJsonObject = (rawValue) => {
  const value = String(rawValue || "").trim();
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return null;
  }

  const candidate = value.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch (_error) {
    return null;
  }
};

const toIsoDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const getRouteDateOffsetDays = ({ source = "", destination = "" }) => {
  const routeKey = `${source}->${destination}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < routeKey.length; index += 1) {
    hash = (hash * 31 + routeKey.charCodeAt(index)) % 9973;
  }
  return 7 + (hash % 36);
};

const sanitizeTripAutofill = (payload = {}, context = {}) => {
  const fallbackStartOffset = getRouteDateOffsetDays(context);
  const startDate =
    toIsoDate(payload.startDate) || toIsoDate(addDays(fallbackStartOffset));
  const endDate = toIsoDate(payload.endDate) || toIsoDate(addDays(fallbackStartOffset + 2)) || startDate;

  const itinerary = Array.isArray(payload.itinerary)
    ? payload.itinerary
        .map((item, index) => ({
          dayNumber: Math.max(1, Math.round(safeNumber(item?.dayNumber, index + 1))),
          activities: safeText(item?.activities, 400),
          accommodation: safeText(item?.accommodation, 180),
        }))
        .filter((item) => item.activities)
    : [];

  const pickupPoints = Array.isArray(payload.pickupPoints)
    ? payload.pickupPoints
        .map((item, index) => ({
          location: safeText(item?.location, 180),
          time: safeText(item?.time, 60),
          sequence: Math.max(1, Math.round(safeNumber(item?.sequence, index + 1))),
        }))
        .filter((item) => item.location && item.time)
    : [];

  return {
    title: safeText(payload.title, 120),
    description: safeText(payload.description, 1000),
    startDate,
    endDate,
    pricePerPerson: Math.max(0, Math.round(safeNumber(payload.pricePerPerson, 0))),
    totalSeats: Math.max(1, Math.round(safeNumber(payload.totalSeats, 1))),
    itinerary: itinerary.length ? itinerary : [{ dayNumber: 1, activities: "Arrival and local orientation", accommodation: "" }],
    pickupPoints: pickupPoints.length ? pickupPoints : [{ location: "Main city pickup point", time: "07:00 AM", sequence: 1 }],
  };
};

const buildAutofillFallback = ({ source, destination }) => {
  const startOffset = getRouteDateOffsetDays({ source, destination });
  return {
    title: `${source} to ${destination} Group Trip`,
    description: `A well-paced group trip from ${source} to ${destination} with coordinated pickup points and daily activities.`,
    startDate: toIsoDate(addDays(startOffset)),
    endDate: toIsoDate(addDays(startOffset + 2)),
    pricePerPerson: 3500,
    totalSeats: 12,
    itinerary: [
      { dayNumber: 1, activities: `Departure from ${source}, transit, and check-in near ${destination}.`, accommodation: `${destination} (budget hotel/guest house)` },
      { dayNumber: 2, activities: `Local sightseeing and curated activities around ${destination}.`, accommodation: `${destination}` },
      { dayNumber: 3, activities: `Return journey from ${destination} to ${source}.`, accommodation: "" },
    ],
    pickupPoints: [
      { location: `${source} central pickup`, time: "06:30 AM", sequence: 1 },
      { location: `${source} bus stand`, time: "07:00 AM", sequence: 2 },
    ],
  };
};

const generateTripAutofill = async (req, res) => {
  try {
    const source = safeText(req.body.source, 120);
    const destination = safeText(req.body.destination, 120);
    const context = typeof req.body.context === "object" && req.body.context !== null ? req.body.context : {};

    if (!source || !destination) {
      return res.status(400).json({ message: "source and destination are required" });
    }

    const prompt = buildTripAutofillPrompt({
      source,
      destination,
      context,
      userName: req.user?.name || "Organizer",
    });

    let suggestion = buildAutofillFallback({ source, destination });
    try {
      const answer = await callGroqCopilot(prompt, { temperature: 0.2, maxTokens: 1200 });
      const parsed = parseJsonObject(answer);
      if (parsed) {
        suggestion = sanitizeTripAutofill(
          {
            ...buildAutofillFallback({ source, destination }),
            ...parsed,
          },
          { source, destination },
        );
      }
    } catch (_error) {
      suggestion = sanitizeTripAutofill(suggestion, { source, destination });
    }

    if (!suggestion.title) {
      suggestion.title = `${source} to ${destination} Group Trip`;
    }
    if (!suggestion.description) {
      suggestion.description = `A curated group trip from ${source} to ${destination}.`;
    }

    return res.status(200).json({
      source,
      destination,
      suggestion: sanitizeTripAutofill(suggestion),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Trip autofill failed" });
  }
};

module.exports = {
  askCopilot,
  generateTripAutofill,
};
