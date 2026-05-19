const DAY_IN_MS = 24 * 60 * 60 * 1000;
const { escapeRegex } = require("../../utils/text");

const normalizeText = (value = "") => String(value || "").trim().replace(/\s+/g, " ");

const parseDateInput = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value);
  }

  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getDayRange = (value) => {
  const date = parseDateInput(value);
  if (!date) {
    return null;
  }

  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );

  return { start, end };
};

const getDateWindow = (value, dayWindow = 0) => {
  const range = getDayRange(value);
  if (!range) {
    return null;
  }

  const safeWindow = Math.max(0, Number(dayWindow || 0));
  const start = new Date(range.start);
  start.setUTCDate(start.getUTCDate() - safeWindow);
  const end = new Date(range.end);
  end.setUTCDate(end.getUTCDate() + safeWindow);

  return { start, end, selectedDate: range.start };
};

const getDateDifferenceInDays = (firstValue, secondValue) => {
  const firstRange = getDayRange(firstValue);
  const secondRange = getDayRange(secondValue);
  if (!firstRange || !secondRange) {
    return null;
  }

  return Math.round(Math.abs(firstRange.start.getTime() - secondRange.start.getTime()) / DAY_IN_MS);
};

const getDateScore = (dayDifference) => {
  if (dayDifference === 0) {
    return 30;
  }
  if (dayDifference === 1) {
    return 20;
  }
  if (dayDifference === 2) {
    return 10;
  }
  return 0;
};

const getClosenessLabel = (dayDifference) => {
  if (dayDifference === 0) {
    return "Exact Date";
  }
  if (typeof dayDifference !== "number" || Number.isNaN(dayDifference)) {
    return "Date Flexible";
  }
  return `${dayDifference} day${dayDifference === 1 ? "" : "s"} apart`;
};

const normalizeGenderPreference = (value) => {
  const normalizedValue = String(value || "").trim().toUpperCase();
  if (normalizedValue === "M" || normalizedValue === "F") {
    return normalizedValue;
  }
  return "Any";
};

const normalizeVehicleType = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (normalizedValue === "car" || normalizedValue === "bike") {
    return normalizedValue;
  }
  return null;
};

const parseSeatCount = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const buildChatRoomId = (firstUserId, secondUserId) =>
  [String(firstUserId), String(secondUserId)].sort().join("_");

module.exports = {
  buildChatRoomId,
  escapeRegex,
  getClosenessLabel,
  getDateDifferenceInDays,
  getDateScore,
  getDateWindow,
  getDayRange,
  normalizeGenderPreference,
  normalizeText,
  normalizeVehicleType,
  parseSeatCount,
};
