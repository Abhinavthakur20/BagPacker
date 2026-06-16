const assert = require("node:assert/strict");
const { haversineDistance, splitExpense } = require("./haversine");
const { escapeRegex, escapeHtml } = require("./text");
const sanitizeUser = require("./sanitizeUser");

const run = () => {
  // Test haversineDistance
  const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437); // NY to LA ~3936 km
  assert.ok(Math.abs(distance - 3936) < 50);

  // Test splitExpense
  assert.equal(splitExpense(100, 1.5, 10, 4), 3.75); // 100km / 10 = 10 litres * 1.5 = 15 cost / 4 passengers = 3.75
  assert.equal(splitExpense(0, 1.5, 10, 4), 0); // 0 distance should return 0 cost
  assert.equal(splitExpense(100, -1, 10, 4), 0); // invalid price should return 0
  assert.equal(splitExpense(100, 1.5, 0, 4), 0); // invalid mileage should return 0
  assert.equal(splitExpense(100, 1.5, 10, 0), 0); // 0 passengers should return 0

  // Test escapeRegex
  assert.equal(escapeRegex("abc.def*"), "abc\\.def\\*");
  assert.equal(escapeRegex(null), "");

  // Test escapeHtml
  assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  assert.equal(escapeHtml(null), "");

  // Test sanitizeUser
  assert.equal(sanitizeUser(null), null);
  const user = {
    _id: "123",
    name: "John",
    email: "john@example.com",
    role: "traveler",
    passwordHash: "secret"
  };
  const sanitized = sanitizeUser(user);
  assert.equal(sanitized._id, "123");
  assert.equal(sanitized.name, "John");
  assert.equal(sanitized.email, "john@example.com");
  assert.equal(sanitized.role, "traveler");
  assert.equal(sanitized.passwordHash, undefined); // should be excluded

  console.log("utils tests passed");
};

run();
