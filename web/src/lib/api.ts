import axios from "axios";

// Bulletproof API configuration for internal calls
const getApiBase = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }

  // Check if we're running on localhost (development)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("localhost");

  // If running on localhost, always use localhost API
  if (isLocalhost) {
    return "http://localhost:3001/api";
  }

  // Production: use relative path for internal calls
  return "/api"; // Internal calls - same server, no internet round trip
};

const API_BASE = getApiBase();
console.log("API_BASE:", API_BASE, "ENV:", {
  PROD: import.meta.env.PROD,
  NODE_ENV: import.meta.env.NODE_ENV,
  VITE_API_URL: import.meta.env.VITE_API_URL,
}); // Debug log

export interface AnalyzeRequest {
  pr_url?: string;
  diff_text?: string;
  github_token?: string;
}

export interface CommentRequest {
  pr_url: string;
  comment_markdown: string;
  github_token: string;
}

export interface AnalyzeResponse {
  pr_meta: {
    title: string;
    number: number;
    author: string;
    created_at: string;
    body?: string;
  };
  stats: {
    total_files: number;
    additions: number;
    deletions: number;
    risk_score_pre: number;
    touched_areas: string[];
    has_tests_changed: boolean;
    deps_major_bump: boolean;
    has_migrations: boolean;
    pr_body_present: boolean;
  };
  heuristics: string[];
  ai?: {
    summary: string[];
    risk: {
      level: "Low" | "Medium" | "High";
      score: number;
      reasons: string[];
      hotspots: { file: string; notes: string }[];
    };
    reviewer_checklist: {
      blocking_items: string[];
      non_blocking_items: string[];
    };
    questions_for_author: string[];
    missing_tests: string[];
    generated_test_plan: {
      unit: string[];
      integration: string[];
      manual: string[];
    };
    commands_to_run: string[];
    suggested_pr_description: string;
  };
  ai_error?: {
    type: string;
    message: string;
    suggestion: string;
  };
  analysis_type?: "ai_powered" | "heuristic_only";
  markdown: {
    pr_description: string;
    review_comment: string;
  };
  files?: {
    filename: string;
    status: "added" | "removed" | "modified" | "renamed";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    oldFilename?: string;
  }[];
}

export const api = {
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await axios.post(`${API_BASE}/analyze`, request);
    return response.data;
  },

  async postComment(
    request: CommentRequest
  ): Promise<{ success: boolean; message: string; comment_url: string }> {
    const response = await axios.post(`${API_BASE}/comment`, request);
    return response.data;
  },

  async health(): Promise<{ ok: boolean; timestamp: string }> {
    const response = await axios.get(`${API_BASE}/../health`);
    return response.data;
  },
};
