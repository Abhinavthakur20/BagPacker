const assert = require("node:assert/strict");

const {
  getClosenessLabel,
  getDateDifferenceInDays,
  getDateScore,
  getDateWindow,
  getDayRange,
  normalizeGenderPreference,
  normalizeText,
  normalizeVehicleType,
  parseSeatCount,
} = require("./companionUtils");

const run = () => {
  assert.equal(normalizeText("  New   Delhi  "), "New Delhi");

  const range = getDayRange("2026-06-10");
  assert.equal(range.start.toISOString(), "2026-06-10T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-06-10T23:59:59.999Z");

  const window = getDateWindow("2026-06-10", 2);
  assert.equal(window.start.toISOString(), "2026-06-08T00:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-06-12T23:59:59.999Z");

  assert.equal(getDateDifferenceInDays("2026-06-10", "2026-06-10"), 0);
  assert.equal(getDateDifferenceInDays("2026-06-10", "2026-06-11"), 1);
  assert.equal(getDateScore(0), 30);
  assert.equal(getDateScore(1), 20);
  assert.equal(getDateScore(2), 10);
  assert.equal(getDateScore(3), 0);
  assert.equal(getClosenessLabel(0), "Exact Date");
  assert.equal(getClosenessLabel(1), "1 day apart");
  assert.equal(getClosenessLabel(2), "2 days apart");

  assert.equal(normalizeGenderPreference("f"), "F");
  assert.equal(normalizeGenderPreference(""), "Any");
  assert.equal(normalizeVehicleType("CAR"), "car");
  assert.equal(normalizeVehicleType("train"), null);
  assert.equal(parseSeatCount("3"), 3);
  assert.equal(parseSeatCount("0", 2), 2);

  console.log("companionUtils tests passed");
};

run();
