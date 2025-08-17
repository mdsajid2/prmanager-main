import express from "express";
import { AuthService } from "../services/auth";
import { ReferralUsageService } from "../services/referral-usage";

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

// Get enhanced usage stats with referral info
router.get("/", requireAuth, async (req, res) => {
  try {
    const stats = await ReferralUsageService.checkLimit(req.user!.id);
    res.json(stats);
  } catch (error) {
    console.error("Get enhanced usage stats error:", error);
    res.status(500).json({ error: "Failed to get usage stats" });
  }
});

// Get referral information
router.get("/referral-info", requireAuth, async (req, res) => {
  try {
    const referralInfo = await ReferralUsageService.getReferralInfo(
      req.user!.id
    );
    res.json(referralInfo);
  } catch (error) {
    console.error("Get referral info error:", error);
    res.status(500).json({ error: "Failed to get referral info" });
  }
});

// Submit limit increase request
router.post("/limit-request", requireAuth, async (req, res) => {
  try {
    const { currentLimit, requestedLimit, reason, useCase, company } = req.body;

    if (!currentLimit || !requestedLimit || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const success = await ReferralUsageService.submitLimitRequest(
      req.user!.id,
      req.user!.email,
      { currentLimit, requestedLimit, reason, useCase, company }
    );

    if (success) {
      res.json({ message: "Limit request submitted successfully" });
    } else {
      res.status(500).json({ error: "Failed to submit request" });
    }
  } catch (error) {
    console.error("Submit limit request error:", error);
    res.status(500).json({ error: "Failed to submit limit request" });
  }
});

export default router;
