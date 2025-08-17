import express from "express";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Auth middleware
const authenticateAdmin = async (req: any, res: any, next: any) => {
  try {
    console.log("🔍 NEW ADMIN AUTH MIDDLEWARE CALLED");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("All headers:", JSON.stringify(req.headers, null, 2));

    const authHeader = req.headers.authorization;
    console.log(
      "Authorization header:",
      authHeader ? `${authHeader.substring(0, 20)}...` : "MISSING"
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No authorization header or invalid format");
      console.log("Available headers:", Object.keys(req.headers));
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not configured");
      return res.status(500).json({ message: "Server configuration error" });
    }

    console.log(
      "🔍 Verifying token with JWT_SECRET length:",
      process.env.JWT_SECRET.length
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    console.log("✅ Token decoded successfully:", {
      userId: decoded.userId,
      email: decoded.email,
    });

    // Get user from database
    const userResult = await pool.query(
      "SELECT id, email, first_name, last_name, subscription_plan, is_verified FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ User not found in database:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    console.log("✅ User found:", {
      email: user.email,
      plan: user.subscription_plan,
    });

    // Check admin privileges
    const isAdmin =
      user.subscription_plan === "enterprise" ||
      user.email === process.env.ADMIN_EMAIL ||
      user.email === "mdsajid8636@gmail.com";

    if (!isAdmin) {
      console.log("❌ User is not admin:", user.email);
      return res.status(403).json({ message: "Admin access required" });
    }

    console.log("✅ Admin access granted for:", user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Get all users
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching all users for admin panel");

    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        subscription_plan, 
        is_verified, 
        api_usage_count, 
        api_usage_limit, 
        created_at, 
        updated_at
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log("✅ Found", result.rows.length, "users");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get admin stats
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching admin stats");

    // Get user counts
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_verified = true) as active_users,
        SUM(api_usage_count) as total_api_calls
      FROM users
    `);

    // Get today's API calls (if you have a usage tracking table)
    let todayApiCalls = 0;
    try {
      const todayStats = await pool.query(`
        SELECT COUNT(*) as today_calls
        FROM api_usage_tracking 
        WHERE DATE(created_at) = CURRENT_DATE
      `);
      todayApiCalls = parseInt(todayStats.rows[0]?.today_calls || "0");
    } catch (e) {
      console.log("No usage tracking table found, using 0 for today calls");
    }

    const stats = {
      totalUsers: parseInt(userStats.rows[0].total_users),
      activeUsers: parseInt(userStats.rows[0].active_users),
      totalApiCalls: parseInt(userStats.rows[0].total_api_calls || "0"),
      todayApiCalls,
    };

    console.log("✅ Admin stats:", stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// Update user
router.put("/users/:userId", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscription_plan, is_verified, api_usage_limit } = req.body;

    console.log("🔍 Updating user:", userId, req.body);

    const result = await pool.query(
      `
      UPDATE users 
      SET 
        subscription_plan = COALESCE($1, subscription_plan),
        is_verified = COALESCE($2, is_verified),
        api_usage_limit = COALESCE($3, api_usage_limit),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, subscription_plan, is_verified, api_usage_limit
    `,
      [subscription_plan, is_verified, api_usage_limit, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User updated:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Reset user usage
router.post(
  "/users/:userId/reset-usage",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      console.log("🔍 Resetting usage for user:", userId);

      const result = await pool.query(
        `
      UPDATE users 
      SET 
        api_usage_count = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, api_usage_count
    `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ Usage reset for user:", result.rows[0]);
      res.json({ message: "Usage reset successfully", user: result.rows[0] });
    } catch (error) {
      console.error("❌ Error resetting usage:", error);
      res.status(500).json({ message: "Failed to reset usage" });
    }
  }
);

// Delete user
router.delete("/users/:userId", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("🔍 Deleting user:", userId);

    // Don't allow deleting the current admin user
    if (userId === (req as any).user.id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING email",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User deleted:", result.rows[0].email);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Test endpoint without auth
router.get("/test", (req, res) => {
  console.log("🧪 NEW ADMIN TEST ENDPOINT CALLED");
  res.json({
    message: "New admin route is working",
    timestamp: new Date().toISOString(),
    headers: req.headers,
  });
});

// Health check for admin routes
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    jwtConfigured: !!process.env.JWT_SECRET,
  });
});

// Reset user usage
router.post(
  "/users/:userId/reset-usage",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;

      console.log("🔍 Resetting usage for user:", userId);

      const result = await pool.query(
        `
      UPDATE users 
      SET 
        api_usage_count = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, api_usage_count
    `,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ Usage reset for user:", result.rows[0]);
      res.json({ message: "Usage reset successfully", user: result.rows[0] });
    } catch (error) {
      console.error("❌ Error resetting usage:", error);
      res.status(500).json({ message: "Failed to reset usage" });
    }
  }
);

// Add bonus credits
router.post(
  "/users/:userId/add-credits",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { credits } = req.body;

      console.log("🔍 Adding credits for user:", userId, "Credits:", credits);

      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }

      const result = await pool.query(
        `
      UPDATE users 
      SET 
        api_usage_limit = api_usage_limit + $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, api_usage_limit
    `,
        [credits, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ Credits added for user:", result.rows[0]);
      res.json({ message: "Credits added successfully", user: result.rows[0] });
    } catch (error) {
      console.error("❌ Error adding credits:", error);
      res.status(500).json({ message: "Failed to add credits" });
    }
  }
);

export default router;
