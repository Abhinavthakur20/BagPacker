import { useEffect, useId, useState } from "react";
import { api } from "../../lib/api";

export default function CityAutocompleteInput({
  value,
  onChange,
  placeholder = "City",
  className = "",
  minChars = 1,
  maxSuggestions = 10,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const listId = `city-suggestions-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const query = String(value || "").trim();
    if (query.length < minChars) {
      setSuggestions([]);
      return undefined;
    }

    let isCancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        const response = await api.get(
          `/trips/cities/suggestions?q=${encodeURIComponent(query)}&limit=${maxSuggestions}`,
          { cacheTtlMs: 15000 },
        );
        if (!isCancelled) {
          setSuggestions(Array.isArray(response?.items) ? response.items : []);
        }
      } catch (_error) {
        if (!isCancelled) {
          setSuggestions([]);
        }
      }
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [maxSuggestions, minChars, value]);

  return (
    <>
      <input
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
    </>
  );
}
