const mongoose = require("mongoose");
const path = require("path");
const envPath = path.join(__dirname, "../backend/.env");
require("dotenv").config({ path: envPath });

const Trip = require("../backend/server/api/trip/tripModel");

async function checkTrips() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const trips = await Trip.find({}).lean();
    console.log("Total Trips in DB:", trips.length);
    trips.forEach(t => {
      console.log(`- ID: ${t._id}, Title: ${t.title}, Source: [${t.source}], Destination: [${t.destination}], Status: ${t.status}, Price: ${t.pricePerPerson}, Seats: ${t.availableSeats}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkTrips();
