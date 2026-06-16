const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { runTripMaintenanceJob } = require("./jobs/tripMaintenanceJob");

dotenv.config();

const run = async () => {
  const startTime = Date.now();
  try {
    // Ping the main web service (if BACKEND_URL is defined) to keep it awake on Render/Heroku
    if (process.env.BACKEND_URL) {
      if (typeof fetch !== "function") {
        console.warn("Global fetch is not available in this Node version. Skipping backend ping.");
      } else {
        console.log(`Pinging backend service at: ${process.env.BACKEND_URL}`);
        try {
          const pingUrl = `${process.env.BACKEND_URL.replace(/\/$/, "")}/api/health`;
          const res = await fetch(pingUrl);
          console.log(`Backend ping response status: ${res.status}`);
        } catch (pingErr) {
          console.warn("Could not ping backend service:", pingErr.message);
        }
      }
    }

    await connectDB();
    const result = await runTripMaintenanceJob();
    const duration = Date.now() - startTime;
    console.log(`Trip maintenance job completed in ${duration}ms:`, result);
    process.exit(0);
  } catch (error) {
    console.error("Trip maintenance job failed:", error.message);
    process.exit(1);
  }
};

run();
