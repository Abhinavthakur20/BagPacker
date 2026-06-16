/**
 * Escapes special regex characters in a string to allow safe dynamic regex creation.
 *
 * @param {string} [value=""] - The input string to escape.
 * @returns {string} The escaped string.
 */
const escapeRegex = (value = "") => {
  const safeStr = value === null || value === undefined ? "" : String(value);
  return safeStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Escapes HTML special characters in a string to prevent XSS.
 *
 * @param {string} [value=""] - The input string to escape.
 * @returns {string} The HTML-escaped string.
 */
const escapeHtml = (value = "") => {
  const safeStr = value === null || value === undefined ? "" : String(value);
  return safeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

module.exports = {
  escapeHtml,
  escapeRegex,
};
