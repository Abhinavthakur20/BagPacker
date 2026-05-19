const getGeoapifyApiKey = () => {
  const rawValue = String(process.env.GEOAPIFY_API_KEY || "").trim();
  if (!rawValue) {
    return "";
  }

  if (rawValue.includes("apiKey=")) {
    try {
      const parsedUrl = new URL(rawValue);
      return String(parsedUrl.searchParams.get("apiKey") || "").trim();
    } catch (_error) {
      const match = /[?&]apiKey=([^&]+)/i.exec(rawValue);
      return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
    }
  }

  return rawValue;
};

module.exports = {
  getGeoapifyApiKey,
};
