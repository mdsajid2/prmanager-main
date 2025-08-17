import express from "express";
import { AuthService } from "../services/auth";
import { SystemHealthService } from "../services/system-health";

const router = express.Router();

// Admin authentication middleware
const requireAdmin = async (
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

    // Check if user is admin
    if (user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Get complete system health report
router.get("/", requireAdmin, async (req, res) => {
  try {
    const healthReport = await SystemHealthService.getCompleteHealthReport();
    res.json(healthReport);
  } catch (error) {
    console.error("Get system health error:", error);
    res.status(500).json({ error: "Failed to get system health" });
  }
});

// Get system metrics only
router.get("/metrics", requireAdmin, async (req, res) => {
  try {
    const metrics = await SystemHealthService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Get system metrics error:", error);
    res.status(500).json({ error: "Failed to get system metrics" });
  }
});

// Get database health only
router.get("/database", requireAdmin, async (req, res) => {
  try {
    const dbHealth = await SystemHealthService.getDatabaseHealth();
    res.json(dbHealth);
  } catch (error) {
    console.error("Get database health error:", error);
    res.status(500).json({ error: "Failed to get database health" });
  }
});

// Get service health only
router.get("/service", requireAdmin, async (req, res) => {
  try {
    const serviceHealth = await SystemHealthService.getServiceHealth();
    res.json(serviceHealth);
  } catch (error) {
    console.error("Get service health error:", error);
    res.status(500).json({ error: "Failed to get service health" });
  }
});

// Get application health only
router.get("/application", requireAdmin, async (req, res) => {
  try {
    const appHealth = await SystemHealthService.getApplicationHealth();
    res.json(appHealth);
  } catch (error) {
    console.error("Get application health error:", error);
    res.status(500).json({ error: "Failed to get application health" });
  }
});

export default router;
