import { Router, Request, Response } from "express";
import { AnalyzeRequestSchema, FileChange, PRMeta } from "../schemas";
import { parsePRUrl, fetchPRData } from "../services/github";
import { parseDiff, getLanguageFromPath } from "../services/diffParser";
import {
  calculateStats,
  generateHotspots,
  getRiskLevel,
} from "../services/heuristics";
import { callKiro } from "../services/kiro";
import { buildMarkdownArtifacts, redactSecrets } from "../services/markdown";
import { cache, generateCacheKey } from "../cache";
import { AuthService } from "../services/auth";
import { SimpleUsageService } from "../services/simple-usage";

const router = Router();

// Middleware to extract user from token (optional for analyze endpoint)
const authenticateToken = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const user = await AuthService.verifySession(token);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error("Token verification error:", error);
      // Don't fail the request, just continue without user
    }
  }

  next();
};

router.post(
  "/analyze",
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = AnalyzeRequestSchema.parse(req.body);
      const { pr_url, diff_text, github_token } = validatedData;

      // Generate cache key
      const cacheKey = generateCacheKey(
        "analyze",
        pr_url || "diff",
        diff_text?.substring(0, 100) || ""
      );

      // Check cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      let prMeta: PRMeta;
      let files: FileChange[];
      let rawFiles: any[] = [];

      if (pr_url) {
        // GitHub PR mode
        const parsed = parsePRUrl(pr_url);
        if (!parsed) {
          return res
            .status(400)
            .json({ error: "Invalid GitHub PR URL format" });
        }

        const { owner, repo, number } = parsed;

        // Get user ID from request if authenticated
        const userId = req.user?.id;

        const result = await fetchPRData(
          owner,
          repo,
          number,
          github_token,
          userId
        );
        prMeta = result.pr;
        files = result.files;

        // Store raw files for diff viewer
        rawFiles = result.rawFiles;
      } else if (diff_text) {
        // Offline diff mode
        const parsedFiles = parseDiff(diff_text);

        // Convert to FileChange format
        files = parsedFiles.map((file) => ({
          path: file.path,
          type: classifyFileType(file.path),
          lang: getLanguageFromPath(file.path),
          additions: file.additions,
          deletions: file.deletions,
          flags: generateFileFlags(file),
          patch_snippet: redactSecrets(file.patch_snippet),
        }));

        // Create mock PR metadata
        prMeta = {
          title: "Pasted Diff Analysis",
          number: 0,
          author: "unknown",
          created_at: new Date().toISOString(),
        };
      } else {
        return res
          .status(400)
          .json({ error: "Either pr_url or diff_text must be provided" });
      }

      // Apply size limits
      if (files.length > 100) {
        return res.status(400).json({
          error: `Too many files (${files.length}). Please limit to 100 files or paste a focused diff.`,
        });
      }

      const totalLines = files.reduce(
        (sum, f) => sum + f.additions + f.deletions,
        0
      );
      if (totalLines > 6000) {
        return res.status(400).json({
          error: `Too many changed lines (${totalLines}). Please limit to 6000 lines or paste a focused diff.`,
        });
      }

      // Calculate heuristics
      const stats = calculateStats(files, prMeta);
      const heuristicHotspots = generateHotspots(files, stats);

      // Select notable files for AI analysis (prioritize non-docs)
      const prioritizedFiles = files
        .sort((a, b) => {
          const priority = {
            code: 0,
            db: 1,
            deps: 2,
            config: 3,
            test: 4,
            infra: 5,
            docs: 6,
          };
          return priority[a.type] - priority[b.type];
        })
        .slice(0, 25);

      // Prepare analysis input
      const analysisInput = {
        pr: prMeta,
        stats,
        files: prioritizedFiles,
        hotspots: heuristicHotspots,
        ask: [
          "summary",
          "risk",
          "checklist",
          "questions",
          "missing_tests",
          "plan",
          "commands",
          "pr_description",
        ],
      };

      // Check daily limits for logged-in users using system keys
      const isGuestUser = !req.user;
      const usingOwnKeys =
        validatedData.ai_provider && validatedData.ai_api_key;

      if (!isGuestUser && !usingOwnKeys && req.user?.id) {
        const usage = await SimpleUsageService.checkLimit(req.user.id);

        if (!usage.allowed) {
          return res.status(429).json({
            error: "Daily limit exceeded",
            message: `You've reached your daily limit of ${usage.limit} free AI analyses.`,
            usage: {
              current: usage.current,
              limit: usage.limit,
              remaining: usage.remaining,
            },
            suggestion:
              "Use your own API keys for unlimited analysis, or wait for the daily reset.",
          });
        }
      }

      // Attempt AI analysis with user-provided settings
      let aiAnalysis = null;
      let aiError = null;

      try {
        aiAnalysis = await callKiro(
          analysisInput,
          validatedData.ai_provider,
          validatedData.ai_api_key,
          isGuestUser
        );

        // Increment daily usage counter for logged-in users using system keys
        if (!isGuestUser && !usingOwnKeys && req.user?.id) {
          await SimpleUsageService.increment(req.user.id);
        }
      } catch (error: any) {
        console.log("AI analysis failed:", error.message);

        // Check if it's an API key error
        if (error.message.includes("AI_KEY_REQUIRED")) {
          aiError = {
            type: "API_KEY_REQUIRED",
            message: isGuestUser
              ? "AI analysis requires your own API keys. Guest users must provide OpenAI, Anthropic, or Gemini API keys."
              : "AI analysis unavailable. Please add your API keys in Settings or contact support.",
            suggestion: isGuestUser
              ? "Add your API keys in Settings to enable AI-powered analysis."
              : "Add your own API keys for unlimited AI analysis, or use the free daily limit with system keys.",
          };
        } else {
          // Other AI errors (rate limits, invalid keys, etc.)
          aiError = {
            type: "AI_ERROR",
            message: "AI analysis temporarily unavailable",
            suggestion:
              "Try again later or use your own API keys for more reliable access.",
          };
        }
      }

      // Build markdown artifacts (only if AI analysis succeeded)
      const markdown = aiAnalysis
        ? buildMarkdownArtifacts(aiAnalysis, heuristicHotspots)
        : null;

      const response = {
        pr_meta: prMeta,
        stats,
        heuristics: heuristicHotspots,
        ai: aiAnalysis,
        ai_error: aiError,
        markdown,
        analysis_type: aiAnalysis ? "ai_powered" : "heuristic_only",
        files: rawFiles.map((file) => ({
          filename: file.filename,
          status: file.status as "added" | "removed" | "modified" | "renamed",
          additions: file.additions,
          deletions: file.deletions,
          changes: file.additions + file.deletions,
          patch: file.patch,
          oldFilename:
            file.status === "renamed" ? file.previous_filename : undefined,
        })),
      };

      // Cache the response
      cache.set(cacheKey, response);

      res.json(response);
    } catch (error) {
      console.error("Analysis error:", error);

      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res
          .status(500)
          .json({ error: "An unexpected error occurred during analysis" });
      }
    }
  }
);

// Helper functions (duplicated from other services for this route)
function classifyFileType(path: string): FileChange["type"] {
  const lowerPath = path.toLowerCase();

  if (
    lowerPath.includes("test") ||
    lowerPath.includes("spec") ||
    lowerPath.includes("__tests__") ||
    lowerPath.endsWith(".test.ts") ||
    lowerPath.endsWith(".test.js") ||
    lowerPath.endsWith(".spec.ts") ||
    lowerPath.endsWith(".spec.js")
  ) {
    return "test";
  }

  const depFiles = [
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "poetry.lock",
    "pipfile.lock",
    "go.mod",
    "go.sum",
    "pom.xml",
    "build.gradle",
  ];
  const filename = path.split("/").pop()?.toLowerCase();
  if (filename && depFiles.includes(filename)) {
    return "deps";
  }

  if (
    lowerPath.startsWith(".github/") ||
    lowerPath.startsWith(".circleci/") ||
    lowerPath.includes("dockerfile") ||
    lowerPath.includes("docker-compose") ||
    lowerPath.startsWith("helm/") ||
    lowerPath.startsWith("k8s/") ||
    lowerPath.startsWith("terraform/") ||
    lowerPath.includes("tsconfig") ||
    lowerPath.includes("eslint") ||
    lowerPath.includes("prettier") ||
    lowerPath.endsWith(".gitlab-ci.yml")
  ) {
    return "config";
  }

  if (
    lowerPath.includes("migration") ||
    lowerPath.includes("migrations") ||
    lowerPath.includes("schema") ||
    lowerPath.endsWith(".sql")
  ) {
    return "db";
  }

  if (lowerPath.endsWith(".md") || lowerPath.startsWith("docs/")) {
    return "docs";
  }

  return "code";
}

function generateFileFlags(file: {
  path: string;
  additions: number;
  deletions: number;
  patch_snippet: string;
}): string[] {
  const flags: string[] = [];
  const lowerPath = file.path.toLowerCase();

  if (
    lowerPath.includes("auth") ||
    lowerPath.includes("security") ||
    lowerPath.includes("acl") ||
    lowerPath.includes("jwt") ||
    lowerPath.includes("oauth") ||
    lowerPath.includes("crypto")
  ) {
    flags.push("touches_auth");
  }

  if (
    lowerPath.includes("payment") ||
    lowerPath.includes("billing") ||
    lowerPath.includes("stripe") ||
    lowerPath.includes("paypal")
  ) {
    flags.push("touches_payment");
  }

  if (file.deletions > file.additions) {
    flags.push("deletes_gt_additions");
  }

  if (
    file.patch_snippet &&
    (file.patch_snippet.includes("export ") ||
      file.patch_snippet.includes("public ") ||
      file.patch_snippet.includes("def ") ||
      file.patch_snippet.includes("function "))
  ) {
    flags.push("changes_public_api");
  }

  return flags;
}

// Middleware for required authentication
const requireAuth = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication token required" });
  }

  try {
    const user = await AuthService.verifySession(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

export default router;
