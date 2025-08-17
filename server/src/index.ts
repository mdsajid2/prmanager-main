import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import analyzeRouter from "./routes/analyze";
import commentRouter from "./routes/comment";
import authRouter from "./routes/auth";
import tokensRouter from "./routes/tokens";
import adminRouter from "./routes/admin";
import newAdminRouter from "./routes/newAdmin";
import healthRouter from "./routes/health";
import dailyUsageRouter from "./routes/daily-usage";
import enhancedUsageRouter from "./routes/enhanced-usage";
import systemHealthRouter from "./routes/system-health";

// Load environment variables from root directory
// Try .env first, then .env.development for local dev
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env.development") });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Global error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.log("🔄 Server continuing to run...");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  console.log("🔄 Server continuing to run...");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📴 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📴 SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Middleware - CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [
          "https://prmanagerai.com",
          "https://www.prmanagerai.com",
          /^https:\/\/.*\.prmanagerai\.com$/,
          /\.cloudfront\.net$/,
          /\.amazonaws\.com$/,
        ]
      : [
          "http://localhost:5173",
          "http://localhost:5174", // Vite dev server
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:8080",
          /^http:\/\/localhost:\d+$/, // Allow any localhost port in development
        ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${
      req.path
    } - Origin: ${req.get("Origin")}`
  );
  next();
});

app.use(express.json({ limit: "10mb" })); // Allow larger payloads for diffs
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from the React app build directory
const webDistPath = path.resolve(__dirname, "../../web/dist");
app.use(express.static(webDistPath));

// Health check routes
app.use("/health", healthRouter);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/tokens", tokensRouter);
app.use("/api/daily-usage", dailyUsageRouter);
app.use("/api/enhanced-usage", enhancedUsageRouter);
app.use("/api/referral-info", enhancedUsageRouter);
app.use("/api/admin/system-health", systemHealthRouter);
app.use("/api/admin", adminRouter);
app.use("/api/new-admin", newAdminRouter);
app.use("/api", analyzeRouter);
app.use("/api", commentRouter);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Something went wrong",
    });
  }
);

// Serve React app for all non-API routes (SPA fallback)
app.get("*", (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  // Serve React app
  res.sendFile(path.resolve(webDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 PR Manager server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Analyze endpoint: http://localhost:${PORT}/api/analyze`);

  if (!process.env.KIRO_API_KEY) {
    console.log("🤖 Using intelligent mock AI analysis (KIRO_API_KEY not set)");
  } else {
    console.log("🤖 Using Kiro API for AI analysis");
  }

  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      "⚠️  GITHUB_TOKEN not set - only public repositories will be accessible"
    );
  }
});
