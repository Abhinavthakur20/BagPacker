import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

export default function CityAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "City",
  className = "",
  minChars = 1,
  maxSuggestions = 10,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedSuggestions = useMemo(
    () =>
      (Array.isArray(suggestions) ? suggestions : [])
        .map((item, index) => {
          if (typeof item === "string") {
            const text = String(item || "").trim();
            if (!text) return null;
            return {
              id: `${text}-${index}`,
              label: text,
              value: text,
              latitude: null,
              longitude: null,
            };
          }
          const label = String(item?.label || item?.value || "").trim();
          const val = String(item?.value || item?.label || "").trim();
          if (!label || !val) return null;
          const lat = Number(item?.latitude);
          const lon = Number(item?.longitude);
          return {
            id: `${val}-${index}`,
            label,
            value: val,
            latitude: Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lon) ? lon : null,
          };
        })
        .filter(Boolean),
    [suggestions],
  );

  const shouldShowDropdown =
    isFocused &&
    String(value || "").trim().length >= minChars &&
    normalizedSuggestions.length > 0;

  const handleSelectSuggestion = (suggestion) => {
    onChange?.({
      target: { value: suggestion.value },
      currentTarget: { value: suggestion.value },
    });
    if (typeof onSelect === "function") {
      onSelect(suggestion);
    }
    setIsFocused(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    const query = String(value || "").trim();
    if (query.length < minChars) {
      setSuggestions([]);
      setActiveIndex(-1);
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
          setActiveIndex(-1);
        }
      } catch (_error) {
        if (!isCancelled) {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      }
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timerId);
    };
  }, [maxSuggestions, minChars, value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange?.(event);
          if (typeof onSelect === "function") {
            onSelect(null);
          }
          setActiveIndex(-1);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setIsFocused(false);
            setActiveIndex(-1);
          }, 120);
        }}
        onKeyDown={(event) => {
          if (!shouldShowDropdown) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) =>
              Math.min(current + 1, normalizedSuggestions.length - 1),
            );
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
            return;
          }

          if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            handleSelectSuggestion(normalizedSuggestions[activeIndex]);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {shouldShowDropdown && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-outline-variant/20 bg-surface shadow-lg">
          {normalizedSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`block w-full px-3 py-2 text-left text-xs font-bold transition ${
                index === activeIndex
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <span className="block truncate">{suggestion.value}</span>
              {suggestion.label !== suggestion.value && (
                <span className="mt-0.5 block truncate text-[10px] font-medium text-on-surface-variant/70">
                  {suggestion.label}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
