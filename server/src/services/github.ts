import axios from "axios";
import { PRMeta, FileChange } from "../schemas";
import { getLanguageFromPath } from "./diffParser";

interface GitHubPR {
  title: string;
  number: number;
  user: { login: string };
  created_at: string;
  body: string | null;
}

interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
  sha: string;
}

export function parsePRUrl(
  url: string
): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
  };
}

export async function fetchPRData(
  owner: string,
  repo: string,
  number: number,
  token?: string,
  userId?: string
): Promise<{ pr: PRMeta; files: FileChange[]; rawFiles: GitHubFile[] }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "PR-Manager/1.0",
  };

  // Use provided token or try to get stored encrypted token
  let githubToken = token;
  if (!githubToken && userId) {
    try {
      const { getDecryptedToken } = await import("../routes/tokens");
      const storedToken = await getDecryptedToken(userId, "github");
      if (storedToken) {
        githubToken = storedToken;
      }
    } catch (error) {
      console.log("No stored GitHub token found for user");
    }
  }

  if (githubToken) {
    headers["Authorization"] = `token ${githubToken}`;
  }

  try {
    // Fetch PR details
    const prResponse = await axios.get<GitHubPR>(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { headers }
    );

    // Fetch PR files
    const filesResponse = await axios.get<GitHubFile[]>(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`,
      { headers }
    );

    const pr: PRMeta = {
      title: prResponse.data.title,
      number: prResponse.data.number,
      author: prResponse.data.user.login,
      created_at: prResponse.data.created_at,
      body: prResponse.data.body || undefined,
    };

    const files: FileChange[] = filesResponse.data.map((file) => ({
      path: file.filename,
      type: classifyFileType(file.filename),
      lang: getLanguageFromPath(file.filename),
      additions: file.additions,
      deletions: file.deletions,
      flags: generateFileFlags(file),
      patch_snippet: truncatePatch(file.patch || ""),
      status: file.status,
    }));

    return { pr, files, rawFiles: filesResponse.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(
          "PR not found. Please check: URL is correct, repository is public, PR number exists. Try providing a GitHub token for private repos."
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          "Access denied. This could be: rate limit exceeded (try again in a few minutes), private repository (provide a GitHub token), or invalid token permissions."
        );
      }
      if (error.response?.status === 401) {
        throw new Error(
          "Authentication failed. Please check your GitHub token is valid and has repo access permissions."
        );
      }
    }
    throw new Error(
      `Failed to fetch PR data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

function classifyFileType(path: string): FileChange["type"] {
  const lowerPath = path.toLowerCase();

  // Test files
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

  // Dependencies
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

  // Config/Infrastructure
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

  // Database
  if (
    lowerPath.includes("migration") ||
    lowerPath.includes("migrations") ||
    lowerPath.includes("schema") ||
    lowerPath.endsWith(".sql")
  ) {
    return "db";
  }

  // Documentation
  if (lowerPath.endsWith(".md") || lowerPath.startsWith("docs/")) {
    return "docs";
  }

  return "code";
}

function generateFileFlags(file: GitHubFile): string[] {
  const flags: string[] = [];
  const lowerPath = file.filename.toLowerCase();

  // Security/Auth related
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

  // Payment related
  if (
    lowerPath.includes("payment") ||
    lowerPath.includes("billing") ||
    lowerPath.includes("stripe") ||
    lowerPath.includes("paypal")
  ) {
    flags.push("touches_payment");
  }

  // Renamed files
  if (file.status === "renamed") {
    flags.push("is_rename");
  }

  // More deletions than additions
  if (file.deletions > file.additions) {
    flags.push("deletes_gt_additions");
  }

  // Check for public API changes (basic heuristic)
  if (
    file.patch &&
    (file.patch.includes("export ") ||
      file.patch.includes("public ") ||
      file.patch.includes("def ") ||
      file.patch.includes("function "))
  ) {
    flags.push("changes_public_api");
  }

  return flags;
}

function truncatePatch(patch: string): string {
  if (!patch) return "";

  const lines = patch.split("\n");
  const maxLines = 300;
  const maxBytes = 8000;

  if (lines.length <= maxLines && patch.length <= maxBytes) {
    return patch;
  }

  // Take first several hunks
  const truncatedLines = lines.slice(0, maxLines);
  let result = truncatedLines.join("\n");

  if (result.length > maxBytes) {
    result = result.substring(0, maxBytes) + "\n... [truncated]";
  }

  return result;
}

export async function postPRComment(
  owner: string,
  repo: string,
  number: number,
  comment: string,
  token: string
): Promise<void> {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${token}`,
    "User-Agent": "PR-Manager/1.0",
  };

  try {
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`,
      { body: comment },
      { headers }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(
          "PR not found or you do not have permission to comment."
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          "Permission denied. Make sure your token has the necessary permissions."
        );
      }
    }
    throw new Error(
      `Failed to post comment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
