const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./api/user/userModel");

dotenv.config();

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }

  return process.argv[index + 1];
};

const config = {
  name: getArgValue("--name") || process.env.ADMIN_NAME || "BagPacker Admin",
  email:
    (getArgValue("--email") || process.env.ADMIN_EMAIL || "admin@bagpacker.com").toLowerCase(),
  phone: getArgValue("--phone") || process.env.ADMIN_PHONE || "9999999999",
  password: getArgValue("--password") || process.env.ADMIN_PASSWORD || "Admin@123",
};

const seedAdmin = async () => {
  try {
    await connectDB();

    const passwordHash = await bcrypt.hash(config.password, 10);

    const admin = await User.findOneAndUpdate(
      { email: config.email },
      {
        $set: {
          name: config.name,
          phone: config.phone,
          passwordHash,
          role: "admin",
          verificationStatus: "verified",
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("Admin seed completed successfully");
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Phone: ${admin.phone}`);
    console.log("Role: admin");
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedAdmin();
