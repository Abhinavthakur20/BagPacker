const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// ─────────────────────────────────────────────
// FORMATTING RULES (injected into every prompt)
// ─────────────────────────────────────────────
const formatInstruction = `
Formatting rules (strictly follow):
- Use **bold** for key terms, place names, prices, and warnings
- Use bullet points (•) for lists — never use dashes
- Use numbered lists for steps or sequences only
- Add a relevant emoji before every section header
- Write section headers in **bold** (e.g. 🎒 **What to Pack**)
- Separate each section with a blank line
- Keep sentences short and scannable — one idea per line
- Never write long unbroken paragraphs
- End every response with one helpful follow-up question to continue the conversation
- Use ₹ for Indian Rupee amounts
- Use ⚠️ to highlight cautions or warnings
`.trim();

// ─────────────────────────────────────────────
// INTENT-SPECIFIC INSTRUCTIONS WITH FORMAT HINTS
// ─────────────────────────────────────────────
const intentInstructions = {
  packing: `
Give practical packing tips tailored to the route, date, and weather.
Use this exact format:

🧳 **Essentials**
• item
• item

📄 **Documents**
• item

👕 **Clothing**
• item

💊 **Health & Safety**
• item

✨ **Optional / Nice to Have**
• item
`.trim(),

  route: `
Provide 2–3 route options with trade-offs.
Use this exact format for each option:

🚌 **Option [N] – [Transport Mode]**
• Duration: X hours
• Cost: ₹X – ₹X
• Best for: [type of traveler]
• ⚠️ Caution: [if any]

Then add a brief ✅ **Our Recommendation** section at the end.
`.trim(),

  safety: `
Provide a safety checklist for travelers meeting companions.
Use this exact format:

✅ **Before You Go**
• tip

🤝 **When You Meet**
• tip

💳 **Money & Payment Caution**
• tip

🚨 **Emergency Prep**
• tip

📞 **Escalation Steps**
1. step
2. step
`.trim(),

  qa: `
Answer as a knowledgeable travel assistant for Indian travelers.
Use headers with emoji, bullet points, and bold for key info.
Keep it concise, practical, and safety-first.
`.trim(),

  trip_autofill: `
Generate realistic organizer trip draft details from source and destination.
Return ONLY valid minified JSON with no markdown or code fences.
`.trim(),
};

// ─────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────
const buildCopilotPrompt = ({ intent, message, context, userName, userProfile }) => {
  const instruction = intentInstructions[intent] || intentInstructions.qa;

  return [
    "You are BagPacker Travel Copilot — a smart, friendly travel assistant for Indian travelers.",
    "",
    "=== YOUR ROLE ===",
    instruction,
    "",
    "=== FORMATTING RULES ===",
    formatInstruction,
    "",
    "=== GUIDELINES ===",
    "- Safety-first in all advice.",
    "- If context data is missing, state your assumptions briefly before answering.",
    "- Avoid medical or legal guarantees. Suggest official or local verification when needed.",
    "- Use the provided chat history and context to give continuity-aware answers.",
    "- For follow-up questions, carry forward context from the recent conversation.",
    "",
    "=== REQUEST ===",
    `User: ${userName || "Traveler"}`,
    `Profile: ${JSON.stringify(userProfile || {})}`,
    `Intent: ${intent}`,
    `Context: ${JSON.stringify(context || {})}`,
    `Question: ${message}`,
  ].join("\n");
};

const buildTripAutofillPrompt = ({ source, destination, context, userName }) =>
  [
    "You are BagPacker AI planner for Indian group trips.",
    "Return ONLY valid minified JSON. Do not return markdown or code fences.",
    "Generate a realistic draft for organizer trip creation.",
    "Use practical defaults if data is missing.",
    "",
    "Output schema:",
    '{"title":"string","description":"string","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","pricePerPerson":number,"totalSeats":number,"itinerary":[{"dayNumber":1,"activities":"string","accommodation":"string"}],"pickupPoints":[{"location":"string","time":"string","sequence":1}]}',
    "",
    "Rules:",
    "- startDate must be a future date; endDate >= startDate",
    "- itinerary must have at least 1 item",
    "- pickupPoints must have at least 1 item",
    "- Keep response focused on route and traveler utility",
    "",
    `Organizer: ${String(userName || "Organizer").trim() || "Organizer"}`,
    `Source: ${String(source || "").trim()}`,
    `Destination: ${String(destination || "").trim()}`,
    `Context: ${JSON.stringify(context || {})}`,
  ].join("\n");

// ─────────────────────────────────────────────
// GROQ API CALLER
// ─────────────────────────────────────────────
const callGroqCopilot = async (prompt, options = {}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in backend environment");
  }

  const temperature =
    typeof options.temperature === "number"
      ? Math.max(0, Math.min(1, options.temperature))
      : 0.4;

  // Raised from 800 → 1200 to avoid cutting off formatted responses
  const maxTokens = Number(options.maxTokens || 1200) || 1200;

  const bodyPayload = {
    model: DEFAULT_MODEL,
    temperature,
    max_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content: options.systemPrompt || "You are BagPacker Travel Copilot — a concise, practical, safety-first travel assistant for Indian travelers. Always format responses with emoji headers, bullet points, and bold key terms. Never write long unbroken paragraphs.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  if (options.jsonMode) {
    bodyPayload.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      "Groq API request failed. Check key, model, or quota settings.";
    throw new Error(message);
  }

  const text = String(data?.choices?.[0]?.message?.content || "").trim();

  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  return text;
};

const extractTripSearchFilters = async (message) => {
  const text = String(message || "").toLowerCase();
  if (!text.trim()) {
    return null;
  }

  const searchIntentPattern =
    /\b(find|search|suggest|show|book|booking|trip|trips|tour|tours|package|packages|vacation|holiday)\b/;
  if (!searchIntentPattern.test(text)) {
    return { isSearch: false };
  }

  let maxBudget;
  const budgetMatch = text.match(
    /\b(?:under|below|within|max(?:imum)?|upto|up to)\s*(?:rs\.?|inr|₹)?\s*(\d[\d,]*)\b/i,
  );
  if (budgetMatch?.[1]) {
    const parsedBudget = Number(budgetMatch[1].replace(/,/g, ""));
    if (Number.isFinite(parsedBudget) && parsedBudget > 0) {
      maxBudget = parsedBudget;
    }
  }

  let destination = "";
  const destinationMatch = text.match(/\b(?:to|for)\s+([a-z][a-z\s]{1,40})\b/i);
  if (destinationMatch?.[1]) {
    destination = destinationMatch[1]
      .trim()
      .replace(/\b(trip|trips|tour|tours|package|packages)\b/gi, "")
      .trim();
  }

  return {
    isSearch: true,
    ...(destination ? { destination } : {}),
    ...(maxBudget ? { maxBudget } : {}),
  };
};

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  buildCopilotPrompt,
  buildTripAutofillPrompt,
  callGroqCopilot,
  extractTripSearchFilters,
};
