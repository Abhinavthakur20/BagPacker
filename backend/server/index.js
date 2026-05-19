const express = require("express");
const http = require("http");
const path = require("path");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const organizerRoutes = require("./routes/organizerRoutes");
const tripRoutes = require("./routes/tripRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const companionRoutes = require("./routes/companionRoutes");
const groupChatRoutes = require("./routes/groupChatRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiRoutes = require("./routes/aiRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { initSocket } = require("./socket/socket");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
].filter(Boolean);

const checkOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    credentials: true,
  },
  pingInterval: 25_000,
  pingTimeout: 20_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

app.use(helmet());
app.use(
  cors({
    origin: checkOrigin,
    credentials: true,
  }),
);
app.use(compression());

// --- Rate limiters ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI rate limit reached, please slow down." },
});

app.use((req, res, next) => {
  if (req.path.startsWith("/uploads")) {
    return next();
  }

  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store");
    return next();
  }

  return next();
});

app.use(express.json({ limit: "1mb" }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"), {
    maxAge: "7d",
    etag: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    },
  }),
);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizers", organizerRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/companions", companionRoutes);
app.use("/api/group-chats", groupChatRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    version: "1.0.1-flexible-search",
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

app.use((_req, res) => {
  return res.status(404).json({ message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  if (err && err.message) {
    const status = (typeof err.status === "number" && err.status >= 400) ? err.status : 500;
    return res.status(status).json({ message: err.message });
  }

  return res.status(500).json({ message: "Internal server error" });
});

startServer();
