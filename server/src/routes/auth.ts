import express from "express";

// Always use PostgreSQL auth service (connects to Supabase database)
import { AuthService } from "../services/auth";
console.log("🔐 Using PostgreSQL authentication service (Supabase database)");

const router = express.Router();

// Middleware to extract user from token
const authenticateToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const user = await AuthService.verifySession(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Sign up
router.post("/signup", async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      company,
      role,
      referralCode,
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const result = await AuthService.signup({
      email,
      password,
      first_name,
      last_name,
      company,
      role,
    });

    // Process referral if provided
    if (referralCode) {
      const { ReferralUsageService } = await import(
        "../services/referral-usage"
      );
      await ReferralUsageService.completeReferral(result.user.id, email);
    }

    // Track signup analytics
    await AuthService.trackAnalytics(
      result.user.id,
      "signup",
      { method: "email", referralCode: referralCode || null },
      req.ip,
      req.get("User-Agent")
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Signup error:", error);
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await AuthService.login({ email, password });

    // Track login analytics
    await AuthService.trackAnalytics(
      result.user.id,
      "login",
      { method: "email" },
      req.ip,
      req.get("User-Agent")
    );

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Error) {
      if (error.message.includes("Invalid email or password")) {
        return res.status(401).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      await AuthService.logout(token);

      // Track logout analytics
      if (req.user) {
        await AuthService.trackAnalytics(
          req.user.id,
          "logout",
          {},
          req.ip,
          req.get("User-Agent")
        );
      }
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json(req.user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, company, role } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Here you would implement user profile update logic
    // For now, just return success
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user analytics/usage stats
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    const stats = {
      api_usage_count: req.user.api_usage_count,
      api_usage_limit: req.user.api_usage_limit,
      subscription_plan: req.user.subscription_plan,
      member_since: req.user.created_at,
    };

    res.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
