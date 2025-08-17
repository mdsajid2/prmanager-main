import express from "express";
import { AuthService } from "../services/auth";
import { SimpleUsageService } from "../services/simple-usage";

const router = express.Router();

// Auth middleware
const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await AuthService.verifySession(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Get daily usage stats
router.get("/", requireAuth, async (req, res) => {
  try {
    const stats = await SimpleUsageService.getStats(req.user!.id);
    const remaining = Math.max(0, stats.limit - stats.count);

    res.json({
      current: stats.count,
      limit: stats.limit,
      remaining,
      date: stats.date,
      allowed: stats.count < stats.limit,
    });
  } catch (error) {
    console.error("Get usage stats error:", error);
    res.status(500).json({ error: "Failed to get usage stats" });
  }
});

export default router;
