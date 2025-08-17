import express from "express";
import { AuthService } from "../services/auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const router = express.Router();

// Database connection with improved configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Admin authentication middleware
const authenticateAdmin = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 Admin auth attempt:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    adminEmail: process.env.ADMIN_EMAIL,
  });

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const user = await AuthService.verifySession(token);
    console.log("👤 Token verified for user:", user?.email);

    if (!user) {
      console.log("❌ No user found for token");
      return res.status(401).json({ message: "Invalid token" });
    }

    if (user.email !== process.env.ADMIN_EMAIL) {
      console.log(
        "❌ User is not admin:",
        user.email,
        "vs",
        process.env.ADMIN_EMAIL
      );
      return res.status(403).json({ message: "Admin access required" });
    }

    console.log("✅ Admin access granted");
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Admin authentication error:", error);
    return res.status(401).json({
      message: "Invalid token",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all users with admin overview
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT * FROM admin_user_overview
        ORDER BY created_at DESC
      `);

      res.json({ users: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset user's monthly usage
router.post("/reset-usage", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const client = await pool.connect();

    try {
      // Call the admin reset function
      const result = await client.query(
        "SELECT admin_reset_user_usage($1, $2) as success",
        [userId, req.user!.email]
      );

      if (!result.rows[0].success) {
        return res.status(403).json({ message: "Admin access denied" });
      }

      res.json({ message: "User usage reset successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Reset user usage error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add bonus credits to user
router.post("/add-credits", authenticateAdmin, async (req, res) => {
  try {
    const { userId, credits } = req.body;

    if (!userId || !credits || credits <= 0) {
      return res
        .status(400)
        .json({ message: "Valid user ID and credits are required" });
    }

    const client = await pool.connect();

    try {
      // Call the admin add credits function
      const result = await client.query(
        "SELECT admin_add_bonus_credits($1, $2, $3) as success",
        [userId, credits, req.user!.email]
      );

      if (!result.rows[0].success) {
        return res.status(403).json({ message: "Admin access denied" });
      }

      res.json({ message: `Added ${credits} bonus credits successfully` });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Add bonus credits error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get platform statistics
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE total_referrals > 0) as active_referrers,
          SUM(total_referrals) as total_referrals,
          SUM(bonus_credits) as total_bonus_credits,
          AVG(referral_multiplier) as avg_multiplier,
          COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_users_week,
          COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as new_users_month
        FROM admin_user_overview
      `);

      const usageStats = await client.query(`
        SELECT 
          COUNT(*) as total_api_calls,
          COUNT(*) FILTER (WHERE endpoint LIKE '%/analyze%') as analyze_calls,
          AVG(response_time_ms) as avg_response_time,
          COUNT(DISTINCT user_id) as active_users
        FROM api_usage 
        WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
      `);

      res.json({
        platform: stats.rows[0],
        usage: usageStats.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
