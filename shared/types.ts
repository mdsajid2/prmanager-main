export interface PRMeta {
  title: string;
  number: number;
  author: string;
  created_at: string;
  body?: string;
}

export interface FileChange {
  path: string;
  type: "code" | "test" | "deps" | "config" | "db" | "infra" | "docs";
  lang: string;
  additions: number;
  deletions: number;
  flags: string[];
  patch_snippet: string;
  status?: string;
}

export interface Stats {
  total_files: number;
  additions: number;
  deletions: number;
  risk_score_pre: number;
  touched_areas: string[];
  has_tests_changed: boolean;
  deps_major_bump: boolean;
  has_migrations: boolean;
  pr_body_present: boolean;
}

export interface AnalysisInput {
  pr: PRMeta;
  stats: Stats;
  files: FileChange[];
  hotspots: string[];
  ask: string[];
}

export interface RiskAssessment {
  level: "Low" | "Medium" | "High";
  score: number;
  reasons: string[];
  hotspots: { file: string; notes: string }[];
}

export interface ReviewerChecklist {
  blocking_items: string[];
  non_blocking_items: string[];
}

export interface TestPlan {
  unit: string[];
  integration: string[];
  manual: string[];
}

export interface AIAnalysis {
  summary: string[];
  risk: RiskAssessment;
  reviewer_checklist: ReviewerChecklist;
  questions_for_author: string[];
  missing_tests: string[];
  generated_test_plan: TestPlan;
  commands_to_run: string[];
  suggested_pr_description: string;
}

export interface AnalyzeRequest {
  pr_url?: string;
  diff_text?: string;
  github_token?: string;
}

export interface AnalyzeResponse {
  pr_meta: PRMeta;
  stats: Stats;
  heuristics: string[];
  ai: AIAnalysis;
  markdown: {
    pr_description: string;
    review_comment: string;
  };
}

export interface CommentRequest {
  pr_url: string;
  comment_markdown: string;
  github_token: string;
}
