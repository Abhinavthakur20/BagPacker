const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const User = require("../api/user/userModel");
const { recalculateAndPersistTrustScore } = require("../api/user/trustScoreService");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const run = async () => {
  await connectDB();

  const cursor = User.find().select("_id").cursor();
  let processed = 0;
  let updated = 0;
  let failed = 0;

  for await (const user of cursor) {
    processed += 1;
    try {
      const trustResult = await recalculateAndPersistTrustScore(user._id);
      if (trustResult) {
        updated += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed user ${String(user._id)}: ${error.message}`);
    }
  }

  console.log(`Trust score backfill finished. processed=${processed}, updated=${updated}, failed=${failed}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  });
