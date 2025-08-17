import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const router = express.Router();

// Create a separate pool for health checks
const healthPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
  max: 2, // Small pool for health checks
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 1000,
});

// Simple health check endpoint
router.get("/", async (req, res) => {
  const healthCheck: any = {
    timestamp: new Date().toISOString(),
    status: "ok",
    services: {
      database: "unknown",
      server: "ok",
    },
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  };

  try {
    // Test database connection
    const client = await healthPool.connect();
    try {
      const result = await client.query("SELECT NOW()");
      healthCheck.services.database = "ok";
      healthCheck.database_time = result.rows[0].now;
    } catch (dbError: any) {
      console.error("❌ Database health check failed:", dbError);
      healthCheck.services.database = "error";
      healthCheck.status = "degraded";
      healthCheck.error = dbError.message;
    } finally {
      client.release();
    }
  } catch (poolError: any) {
    console.error("❌ Database pool health check failed:", poolError);
    healthCheck.services.database = "error";
    healthCheck.status = "degraded";
    healthCheck.error = poolError.message;
  }

  // Set appropriate status code
  const statusCode = healthCheck.status === "ok" ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

export default router;
