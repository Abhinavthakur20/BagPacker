const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { runTripMaintenanceJob } = require("./jobs/tripMaintenanceJob");

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    const result = await runTripMaintenanceJob();
    console.log("Trip maintenance job completed:", result);
    process.exit(0);
  } catch (error) {
    console.error("Trip maintenance job failed:", error.message);
    process.exit(1);
  }
};

run();
