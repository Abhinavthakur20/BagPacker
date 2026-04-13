const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const organizerRoutes = require("./routes/organizerRoutes");
const tripRoutes = require("./routes/tripRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const companionRoutes = require("./routes/companionRoutes");
const groupChatRoutes = require("./routes/groupChatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { initSocket } = require("./socket/socket");

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server(server, {
  cors: {
    origin: clientUrl,
    credentials: true,
  },
});

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/companions", companionRoutes);
app.use("/api/group-chats", groupChatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  try {
    await connectDB();
    initSocket(io);
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

app.use((err, _req, res, _next) => {
  if (err && err.message) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: "Internal server error" });
});

app.use((_req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

startServer();
