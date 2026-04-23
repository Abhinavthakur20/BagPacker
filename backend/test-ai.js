require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const { extractTripSearchFilters } = require("./server/api/ai/aiService");
const Trip = require("./server/api/trip/tripModel");

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/bagpacker");
  console.log("Connected to DB");

  const message = "Suggest me some trips to Gulmarg";
  const filters = await extractTripSearchFilters(message);
  console.log("Filters:", filters);

  if (filters?.isSearch) {
    const query = { status: "active", availableSeats: { $gt: 0 } };
    if (filters.destination) query.destination = new RegExp(filters.destination, "i");
    if (filters.maxBudget) query.pricePerPerson = { $lte: filters.maxBudget };
    
    console.log("Query:", query);
    const trips = await Trip.find(query);
    console.log("Found trips:", trips.length);
    console.log(trips.map(t => t.title));
  }
  
  process.exit(0);
}

test().catch(console.error);
