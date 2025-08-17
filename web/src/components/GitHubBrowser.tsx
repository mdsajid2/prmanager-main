import React, { useState, useEffect } from "react";
import axios from "axios";

interface GitHubBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPR: (prUrl: string) => void;
  githubToken?: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  updated_at: string;
  open_issues_count?: number;
  has_open_prs?: boolean;
  open_prs_count?: number;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  user: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  html_url: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  draft?: boolean;
  merged_at?: string | null;
}

export const GitHubBrowser: React.FC<GitHubBrowserProps> = ({
  isOpen,
  onClose,
  onSelectPR,
  githubToken,
}) => {
  const [step, setStep] = useState<"repos" | "prs">("repos");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const headers = {
    Accept: "application/vnd.github.v3+json",
    ...(githubToken && { Authorization: `token ${githubToken}` }),
  };

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        "https://api.github.com/user/repos?sort=updated&per_page=50",
        { headers }
      );

      const repos = response.data;

      // Fetch PR counts for each repository (in batches to avoid rate limits)
      const reposWithPRCounts = await Promise.all(
        repos.map(async (repo: Repository) => {
          try {
            // Only check for PRs if the repo has issues (PRs are issues in GitHub API)
            if (repo.open_issues_count && repo.open_issues_count > 0) {
              const prResponse = await axios.get(
                `https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=1`,
                { headers }
              );

              // Get the total count from the Link header or response
              const linkHeader = prResponse.headers.link;
              let openPRCount = 0;

              if (linkHeader && linkHeader.includes('rel="last"')) {
                // Extract count from pagination
                const lastPageMatch = linkHeader.match(
                  /page=(\d+)>; rel="last"/
                );
                if (lastPageMatch) {
                  openPRCount = parseInt(lastPageMatch[1]);
                }
              } else if (prResponse.data.length > 0) {
                // If no pagination, count the actual PRs
                const allPRsResponse = await axios.get(
                  `https://api.github.com/repos/${repo.full_name}/pulls?state=open`,
                  { headers }
                );
                openPRCount = allPRsResponse.data.length;
              }

              return {
                ...repo,
                has_open_prs: openPRCount > 0,
                open_prs_count: openPRCount,
              };
            }

            return {
              ...repo,
              has_open_prs: false,
              open_prs_count: 0,
            };
          } catch (error) {
            // If PR fetch fails, just return repo without PR info
            console.warn(`Failed to fetch PRs for ${repo.full_name}:`, error);
            return {
              ...repo,
              has_open_prs: false,
              open_prs_count: 0,
            };
          }
        })
      );

      setRepositories(reposWithPRCounts);
    } catch (err) {
      setError("Failed to fetch repositories. Please check your GitHub token.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPullRequests = async (repo: Repository) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repo.full_name}/pulls?state=all&sort=updated&direction=desc&per_page=50`,
        { headers }
      );
      // Sort PRs: open first, then by updated date
      const sortedPRs = response.data.sort((a: any, b: any) => {
        // Open PRs first
        if (a.state === "open" && b.state !== "open") return -1;
        if (b.state === "open" && a.state !== "open") return 1;

        // Then by updated date (most recent first)
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });

      setPullRequests(sortedPRs);
      setSelectedRepo(repo);
      setStep("prs");
    } catch (err) {
      setError("Failed to fetch pull requests.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && githubToken) {
      fetchRepositories();
    }
  }, [isOpen, githubToken]);

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPRs = pullRequests.filter(
    (pr) =>
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.user.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  if (!githubToken) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">🔑 GitHub Token Required</h2>
          <p className="text-gray-600 mb-6">
            Please configure your GitHub token in Settings to browse
            repositories.
          </p>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {step === "prs" && (
              <button
                onClick={() => setStep("repos")}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
            )}
            <h2 className="text-2xl font-bold gradient-text">
              {step === "repos"
                ? "📁 Select Repository"
                : "🔀 Select Pull Request"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder={
              step === "repos"
                ? "Search repositories..."
                : "Search pull requests..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
          />

          {/* Status Legend */}
          {step === "repos" ? (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-medium text-gray-700">
                  Repository Status:
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-blue-700">Has Open PRs</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-600">No Open PRs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-medium text-gray-700">PR Status:</span>
                <div className="flex items-center space-x-1">
                  <span>🔵</span>
                  <span className="text-blue-700">Open</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🟡</span>
                  <span className="text-yellow-700">Draft</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🟢</span>
                  <span className="text-green-700">Merged</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>⚫</span>
                  <span className="text-gray-700">Closed</span>
                </div>
                <div className="border-l border-gray-300 pl-3 flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <span>🔥</span>
                    <span className="text-green-600">Today</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>⚡</span>
                    <span className="text-blue-600">Recent</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner"></div>
              <span className="ml-3">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() =>
                  step === "repos"
                    ? fetchRepositories()
                    : fetchPullRequests(selectedRepo!)
                }
                className="btn-secondary"
              >
                Try Again
              </button>
            </div>
          ) : step === "repos" ? (
            <div className="space-y-3">
              {filteredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className={`card-compact cursor-pointer transition-all duration-200 floating-card ${
                    repo.has_open_prs
                      ? "border-l-4 border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/60"
                      : "hover:bg-blue-50/50"
                  }`}
                  onClick={() => fetchPullRequests(repo)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3
                          className={`font-semibold ${
                            repo.has_open_prs
                              ? "text-blue-900"
                              : "text-gray-900"
                          }`}
                        >
                          {repo.name}
                        </h3>
                        {repo.private && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Private
                          </span>
                        )}
                        {repo.has_open_prs && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200 flex items-center space-x-1">
                            <span>🔵</span>
                            <span>
                              {repo.open_prs_count} Open PR
                              {repo.open_prs_count !== 1 ? "s" : ""}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          Updated{" "}
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </p>
                        {repo.has_open_prs && (
                          <p className="text-xs text-blue-600 font-medium">
                            ✨ Has active PRs
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {repo.has_open_prs && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredRepos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No repositories found
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPRs.map((pr) => (
                <div
                  key={pr.id}
                  className={`card-compact cursor-pointer transition-all duration-200 floating-card border-l-4 ${
                    pr.state === "open"
                      ? pr.draft
                        ? "border-l-yellow-400 hover:bg-yellow-50/50"
                        : "border-l-blue-400 hover:bg-blue-50/50"
                      : pr.merged_at
                      ? "border-l-green-400 hover:bg-green-50/50"
                      : "border-l-gray-400 hover:bg-gray-50/50"
                  }`}
                  onClick={() => {
                    onSelectPR(pr.html_url);
                    onClose();
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <img
                      src={pr.user.avatar_url}
                      alt={pr.user.login}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">
                          #{pr.number}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1 ${
                            pr.state === "open"
                              ? pr.draft
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                              : pr.merged_at
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-gray-100 text-gray-800 border border-gray-200"
                          }`}
                        >
                          <span className="text-xs">
                            {pr.state === "open"
                              ? pr.draft
                                ? "🟡"
                                : "🔵"
                              : pr.merged_at
                              ? "🟢"
                              : "⚫"}
                          </span>
                          <span>
                            {pr.state === "open"
                              ? pr.draft
                                ? "Draft"
                                : "Open"
                              : pr.merged_at
                              ? "Merged"
                              : "Closed"}
                          </span>
                        </span>
                        {pr.state === "open" && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                            ✨ Active
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {pr.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>by {pr.user.login}</span>
                        <span className="flex items-center space-x-1">
                          <span>
                            {new Date(pr.created_at).toLocaleDateString()}
                          </span>
                          {(() => {
                            const daysSinceUpdate = Math.floor(
                              (Date.now() - new Date(pr.updated_at).getTime()) /
                                (1000 * 60 * 60 * 24)
                            );
                            if (daysSinceUpdate === 0) {
                              return (
                                <span className="text-green-600 font-medium">
                                  🔥 Today
                                </span>
                              );
                            } else if (daysSinceUpdate <= 3) {
                              return (
                                <span className="text-blue-600 font-medium">
                                  ⚡ Recent
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </span>
                        {pr.changed_files && (
                          <span>{pr.changed_files} files changed</span>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              ))}
              {filteredPRs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No pull requests found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
