const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./api/user/userModel");
const Organizer = require("./api/organizer/organizerModel");

dotenv.config();

const testUsers = [
  {
    name: "Rohan Organizer",
    email: "organizer1@bagpacker.com",
    phone: "9000000001",
    password: "Test@123",
    role: "organizer",
    verificationStatus: "verified",
    trustScore: 92,
  },
  {
    name: "Aarav Traveler",
    email: "traveler1@bagpacker.com",
    phone: "9000000002",
    password: "Test@123",
    role: "traveler",
    verificationStatus: "verified",
    trustScore: 85,
  },
  {
    name: "Isha Traveler",
    email: "traveler2@bagpacker.com",
    phone: "9000000003",
    password: "Test@123",
    role: "traveler",
    verificationStatus: "verified",
    trustScore: 88,
  },
  {
    name: "Kabir Traveler",
    email: "traveler3@bagpacker.com",
    phone: "9000000004",
    password: "Test@123",
    role: "traveler",
    verificationStatus: "pending",
    trustScore: 73,
  },
];

const organizerProfile = {
  businessName: "PeakTrail Expeditions",
  gstNumber: `GSTTEST${Date.now().toString().slice(-6)}Z9`,
  bankAccountDetails: "Bank of India - 1122334455",
  approvalStatus: "approved",
};

const seedTestUsers = async () => {
  try {
    await connectDB();

    const userByEmail = new Map();

    for (const userConfig of testUsers) {
      const passwordHash = await bcrypt.hash(userConfig.password, 10);
      const user = await User.findOneAndUpdate(
        { email: userConfig.email.toLowerCase() },
        {
          $set: {
            name: userConfig.name,
            email: userConfig.email.toLowerCase(),
            phone: userConfig.phone,
            passwordHash,
            role: userConfig.role,
            verificationStatus: userConfig.verificationStatus,
            trustScore: userConfig.trustScore,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      userByEmail.set(userConfig.email.toLowerCase(), user);
    }

    const organizerUser = userByEmail.get("organizer1@bagpacker.com");

    await Organizer.findOneAndUpdate(
      { userId: organizerUser._id },
      {
        $set: {
          businessName: organizerProfile.businessName,
          gstNumber: organizerProfile.gstNumber,
          bankAccountDetails: organizerProfile.bankAccountDetails,
          approvalStatus: organizerProfile.approvalStatus,
          approvedAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log("Test users seeded successfully.");
    console.log("Use these credentials for real UI testing:");
    console.log("organizer1@bagpacker.com / Test@123 (approved organizer)");
    console.log("traveler1@bagpacker.com / Test@123");
    console.log("traveler2@bagpacker.com / Test@123");
    console.log("traveler3@bagpacker.com / Test@123");
  } catch (error) {
    console.error("Test user seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedTestUsers();
