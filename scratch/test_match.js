const mongoose = require("mongoose");
const path = require("path");
const envPath = path.join(__dirname, "../backend/.env");
require("dotenv").config({ path: envPath });

const Trip = require("../backend/server/api/trip/tripModel");

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFlexibleLocationFilter = (queryValue) => {
  const trimmed = String(queryValue || "").trim();
  if (!trimmed) return null;

  const words = trimmed
    .split(/[\s,.\-/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  const significantWords = words.filter((w) => w.length > 2);
  const wordsToUse = significantWords.length > 0 ? significantWords : words;

  if (wordsToUse.length === 0) return null;

  const pattern = wordsToUse.map((w) => escapeRegex(w)).join("|");
  return { $regex: pattern, $options: "i" };
};

async function testMatch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const filters = { status: "active" };
    const sourceQuery = "Delhi, India";
    const sourceFilter = buildFlexibleLocationFilter(sourceQuery);
    if (sourceFilter) filters.source = sourceFilter;
    
    filters.pricePerPerson = { $lte: 30000 };
    filters.availableSeats = { $gte: 1 };

    console.log("Filters:", JSON.stringify(filters, null, 2));

    const results = await Trip.find(filters).lean();
    console.log("Results found:", results.length);
    results.forEach(r => console.log(`- ${r.title}: ${r.source}`));

    // Test with aggregate
    const aggResults = await Trip.aggregate([
        { $match: filters }
    ]);
    console.log("Aggregate results found:", aggResults.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testMatch();
