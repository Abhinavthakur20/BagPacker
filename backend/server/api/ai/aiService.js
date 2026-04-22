const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const intentInstructions = {
  packing:
    "Give practical packing tips tailored to route/date/weather assumptions. Group by essentials, clothing, documents, health/safety, and optional items.",
  route:
    "Provide route suggestions with 2-3 options, transport mode trade-offs, rough timing, budget range guidance, and cautions.",
  safety:
    "Provide a meetup safety checklist for travelers meeting companions. Include identity checks, public place guidance, emergency prep, money/payment caution, and escalation steps.",
  qa: "Answer as a travel assistant with concise actionable guidance and short bullet points.",
};

const buildCopilotPrompt = ({ intent, message, context, userName, userProfile }) => {
  const instruction = intentInstructions[intent] || intentInstructions.qa;
  return [
    "You are BagPacker Travel Copilot for Indian travelers.",
    instruction,
    "Keep response concise, practical, and safety-first.",
    "If context data is missing, state assumptions briefly.",
    "Avoid medical/legal guarantees. Suggest official/local verification when needed.",
    "Use provided chat history and connected chat summaries to make contextual answers.",
    "If user asks follow-ups, carry forward continuity from recent conversation.",
    "",
    `User: ${userName}`,
    `UserProfile: ${JSON.stringify(userProfile || {})}`,
    `Intent: ${intent}`,
    `Context: ${JSON.stringify(context || {})}`,
    `Question: ${message}`,
  ].join("\n");
};

const callGroqCopilot = async (prompt) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in backend environment");
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.4,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content:
            "You are BagPacker Travel Copilot. Be concise, practical, and safety-first for traveler assistance.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "Groq API request failed. Check key, model, or quota settings.";
    throw new Error(message);
  }

  const text = String(data?.choices?.[0]?.message?.content || "").trim();

  if (!text) {
    throw new Error("Groq returned an empty response");
  }

  return text;
};

module.exports = {
  buildCopilotPrompt,
  callGroqCopilot,
};
