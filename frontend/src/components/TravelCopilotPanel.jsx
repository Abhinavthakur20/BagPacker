import { useMemo, useState } from "react";
import { api } from "../lib/api";

const QUICK_PROMPTS = [
  {
    intent: "packing",
    label: "Packing Tips",
    prompt: "Give me a smart packing list for this trip.",
  },
  {
    intent: "route",
    label: "Route Suggestions",
    prompt: "Suggest the best route options with time and budget tradeoffs.",
  },
  {
    intent: "safety",
    label: "Meetup Safety",
    prompt: "Give me a practical meetup safety checklist before meeting a travel companion.",
  },
  {
    intent: "qa",
    label: "Instant Q&A",
    prompt: "Answer this travel question based on my trip context.",
  },
];

export default function TravelCopilotPanel({ context = {}, className = "" }) {
  const [intent, setIntent] = useState("qa");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hasUsefulContext = useMemo(
    () =>
      Boolean(
        context?.source ||
          context?.destination ||
          context?.travelDate ||
          context?.roomLabel ||
          context?.companionName,
      ),
    [context],
  );

  const submitQuestion = async (event) => {
    event?.preventDefault();
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await api.post("/ai/copilot", {
        intent,
        message: question.trim(),
        context,
      });
      setAnswer(response?.answer || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyQuickPrompt = (item) => {
    setIntent(item.intent);
    setQuestion(item.prompt);
    setError("");
  };

  return (
    <article className={`rounded-2xl bg-[#f1eee7] p-4 shadow-sm ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a5b18]">AI Travel Copilot</p>
      <h3 className="mt-1 font-headline text-2xl font-bold text-[#132c22]">Plan smarter, travel safer</h3>

      {!hasUsefulContext ? (
        <p className="mt-2 text-xs text-[#6b7069]">
          Tip: select a route, match, or chat room to get context-aware answers.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => applyQuickPrompt(item)}
            className="rounded-xl bg-white px-3 py-2 text-left text-xs font-semibold text-[#1f2e27] hover:bg-[#e8e4db]"
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={submitQuestion} className="mt-3 space-y-2">
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          className="w-full rounded-xl bg-white px-3 py-2 text-sm"
        >
          <option value="packing">Packing tips</option>
          <option value="route">Route suggestions</option>
          <option value="safety">Meetup safety checklist</option>
          <option value="qa">Instant Q&A</option>
        </select>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          maxLength={1200}
          placeholder="Ask anything about this trip..."
          className="w-full rounded-xl bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#1a513d] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isLoading ? "Thinking..." : "Ask Copilot"}
        </button>
      </form>

      {error ? (
        <div className="mt-3 rounded-xl bg-[#ffd7d7] px-3 py-2 text-xs font-semibold text-[#8a1f1f]">
          {error}
        </div>
      ) : null}

      {answer ? (
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-white px-3 py-3 text-sm leading-relaxed text-[#2a322d] whitespace-pre-wrap">
          {answer}
        </div>
      ) : null}
    </article>
  );
}
