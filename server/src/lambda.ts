import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import analyzeRouter from "./routes/analyze";
import commentRouter from "./routes/comment";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://your-amplify-domain.amplifyapp.com",
      "http://localhost:5173",
      /\.amplifyapp\.com$/,
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Routes
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

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Export the serverless handler
export const handler = serverlessExpress({ app });
