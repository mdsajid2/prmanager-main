import { z } from "zod";

export const AnalyzeRequestSchema = z
  .object({
    pr_url: z.string().optional(),
    diff_text: z.string().optional(),
    github_token: z.string().optional(),
    ai_provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
    ai_api_key: z.string().optional(),
  })
  .refine((data) => data.pr_url || data.diff_text, {
    message: "Either pr_url or diff_text must be provided",
  });

export const CommentRequestSchema = z.object({
  pr_url: z.string(),
  comment_markdown: z.string(),
  github_token: z.string(),
});

export const FileChangeSchema = z.object({
  path: z.string(),
  type: z.enum(["code", "test", "deps", "config", "db", "infra", "docs"]),
  lang: z.string(),
  additions: z.number(),
  deletions: z.number(),
  flags: z.array(z.string()),
  patch_snippet: z.string(),
  status: z.string().optional(),
});

export const PRMetaSchema = z.object({
  title: z.string(),
  number: z.number(),
  author: z.string(),
  created_at: z.string(),
  body: z.string().optional(),
});

export const StatsSchema = z.object({
  total_files: z.number(),
  additions: z.number(),
  deletions: z.number(),
  risk_score_pre: z.number(),
  touched_areas: z.array(z.string()),
  has_tests_changed: z.boolean(),
  deps_major_bump: z.boolean(),
  has_migrations: z.boolean(),
  pr_body_present: z.boolean(),
});

export const AnalysisInputSchema = z.object({
  pr: PRMetaSchema,
  stats: StatsSchema,
  files: z.array(FileChangeSchema),
  hotspots: z.array(z.string()),
  ask: z.array(z.string()),
});

// AI Output Schema for validation
export const AIAnalysisSchema = z.object({
  summary: z.array(z.string()),
  risk: z.object({
    level: z.enum(["Low", "Medium", "High"]),
    score: z.number().min(0).max(100),
    reasons: z.array(z.string()),
    hotspots: z.array(
      z.object({
        file: z.string(),
        notes: z.string(),
      })
    ),
  }),
  reviewer_checklist: z.object({
    blocking_items: z.array(z.string()),
    non_blocking_items: z.array(z.string()),
  }),
  questions_for_author: z.array(z.string()),
  missing_tests: z.array(z.string()),
  generated_test_plan: z.object({
    unit: z.array(z.string()),
    integration: z.array(z.string()),
    manual: z.array(z.string()),
  }),
  commands_to_run: z.array(z.string()),
  suggested_pr_description: z.string(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type CommentRequest = z.infer<typeof CommentRequestSchema>;
export type FileChange = z.infer<typeof FileChangeSchema>;
export type PRMeta = z.infer<typeof PRMetaSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;
