import React, { useState } from "react";
import { AnalyzeResponse } from "../lib/api";
import { RiskBadge } from "./RiskBadge";
import DiffViewer from "./DiffViewer";
import { SimpleUsageStats } from "./SimpleUsageStats";

interface ResultsTabsProps {
  results: AnalyzeResponse;
  onPostComment?: (commentMarkdown: string, githubToken: string) => void;
  isPostingComment?: boolean;
  githubToken?: string;
  enableMergeFeature?: boolean;
  mergePermissionsVerified?: boolean;
}

export const ResultsTabs: React.FC<ResultsTabsProps> = ({
  results,
  onPostComment,
  isPostingComment = false,
  githubToken = "",
  enableMergeFeature = false,
  mergePermissionsVerified = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Check if AI analysis is available
  const hasAIAnalysis = results.ai && !results.ai_error;
  const analysisType =
    results.analysis_type || (hasAIAnalysis ? "ai_powered" : "heuristic_only");

  // Safe AI data access with fallbacks
  const aiData =
    hasAIAnalysis && results.ai
      ? results.ai
      : {
          risk: { score: 0, level: "Low" as const, reasons: [], hotspots: [] },
          summary: [],
          reviewer_checklist: { blocking_items: [], non_blocking_items: [] },
          questions_for_author: [],
          missing_tests: [],
          generated_test_plan: { unit: [], integration: [], manual: [] },
          commands_to_run: [],
          suggested_pr_description: "",
        };

  const [tokenForComment, setTokenForComment] = useState(githubToken);
  const [mergeStrategy, setMergeStrategy] = useState<
    "merge" | "squash" | "rebase"
  >("squash");
  const [deleteBranch, setDeleteBranch] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [isMerging, setIsMerging] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    }
  };

  const handleMergePR = async () => {
    if (!githubToken) {
      alert("GitHub token is required for merging");
      return;
    }

    // For now, we'll need the PR URL to be passed or extracted from results
    // This is a placeholder - in real implementation, we'd get this from the analysis
    const prUrl = `https://github.com/owner/repo/pull/${results.pr_meta.number}`;

    // Extract owner, repo, and PR number from URL
    const prUrlMatch = prUrl.match(
      /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/
    );
    if (!prUrlMatch) {
      alert("Invalid PR URL format");
      return;
    }

    const [, owner, repo, prNumber] = prUrlMatch;

    // Show confirmation dialog for high-risk PRs
    if (hasAIAnalysis && aiData.risk.score > 70) {
      const confirmed = window.confirm(
        `⚠️ High Risk PR (${aiData.risk.score}/100)\n\n` +
          `This PR has been flagged as high risk. Are you sure you want to merge?\n\n` +
          `Risk factors:\n${aiData.risk.reasons.join(", ").slice(0, 200)}...`
      );
      if (!confirmed) return;
    }

    setIsMerging(true);
    try {
      // Prepare merge commit message
      let commitMessage = `Merge pull request #${prNumber}`;
      if (includeAnalysis) {
        commitMessage += `\n\nPR Manager Analysis:\n- Risk Score: ${
          aiData.risk.score
        }/100\n- Risk Level: ${aiData.risk.level}\n- Summary: ${aiData.summary
          .slice(0, 2)
          .join(", ")}\n- Reviewed by: PR Manager AI`;
      }

      // GitHub API merge request
      const mergeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commit_title: `Merge pull request #${prNumber}`,
            commit_message: commitMessage,
            merge_method: mergeStrategy,
            delete_branch: deleteBranch,
          }),
        }
      );

      if (!mergeResponse.ok) {
        const errorData = await mergeResponse.json();
        throw new Error(errorData.message || "Merge failed");
      }

      const mergeData = await mergeResponse.json();
      alert(
        `✅ PR merged successfully!\n\nCommit: ${mergeData.sha}\nMerge method: ${mergeStrategy}`
      );

      // Optionally refresh the page or update UI
      window.location.reload();
    } catch (error) {
      console.error("Merge failed:", error);
      alert(
        `❌ Merge failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsMerging(false);
    }
  };

  const handlePostComment = () => {
    if (!tokenForComment.trim()) {
      alert("GitHub token is required to post comments");
      return;
    }
    onPostComment?.(results.markdown.review_comment, tokenForComment);
  };

  // Define tabs based on available analysis
  const baseTabs = [
    { id: "overview", label: "Overview" },
    { id: "changes", label: "Code Changes" },
  ];

  const aiTabs = hasAIAnalysis
    ? [
        { id: "checklist", label: "Reviewer Checklist" },
        { id: "tests", label: "Tests & Plan" },
        { id: "comment", label: "Comment" },
      ]
    : [];

  const utilityTabs = [{ id: "usage", label: "📊 Usage" }];

  const tabs = [...baseTabs, ...aiTabs, ...utilityTabs] as const;

  return (
    <div className="card">
      {/* AI Analysis Status */}
      {results.ai_error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">
                AI Analysis Unavailable
              </h3>
              <p className="text-amber-700 text-sm mb-2">
                {results.ai_error.message}
              </p>
              <p className="text-amber-600 text-xs">
                💡 {results.ai_error.suggestion}
              </p>
              <div className="mt-3 text-xs text-amber-600">
                <strong>Available:</strong> Basic heuristic analysis, code diff
                viewing, and repository information
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Type Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              analysisType === "ai_powered"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {analysisType === "ai_powered"
              ? "🤖 AI-Powered Analysis"
              : "📊 Heuristic Analysis"}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-button flex-1 ${
              activeTab === tab.id ? "active" : "inactive"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* PR Info */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {results.pr_meta.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>#{results.pr_meta.number}</span>
              <span>by {results.pr_meta.author}</span>
              <span>
                {new Date(results.pr_meta.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Risk Assessment - Only show for AI analysis */}
          {hasAIAnalysis && (
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <h4 className="text-md font-medium">AI Risk Assessment</h4>
                <RiskBadge
                  level={aiData.risk.level}
                  score={aiData.risk.score}
                />
              </div>
            </div>
          )}

          {/* Basic Analysis - Always available */}
          <div>
            <h4 className="text-md font-medium mb-3">
              {hasAIAnalysis ? "Repository Statistics" : "Basic Analysis"}
            </h4>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {results.stats.total_files}
                </div>
                <div className="text-sm text-gray-600">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  +{results.stats.additions}
                </div>
                <div className="text-sm text-gray-600">Additions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  -{results.stats.deletions}
                </div>
                <div className="text-sm text-gray-600">Deletions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.stats.touched_areas.length}
                </div>
                <div className="text-sm text-gray-600">Areas</div>
              </div>
            </div>

            {/* Touched Areas */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Touched Areas:
              </h5>
              <div className="flex flex-wrap gap-2">
                {results.stats.touched_areas.map((area) => (
                  <span
                    key={area}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Summary - Only show for AI analysis */}
          {hasAIAnalysis && aiData.summary.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">AI Summary</h4>
              <ul className="space-y-2">
                {aiData.summary.map((item, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Risk Reasons - Only show for AI analysis */}
          {hasAIAnalysis && aiData.risk.reasons.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">AI Risk Assessment</h4>
              <ul className="space-y-2">
                {aiData.risk.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-500 mt-1">⚠</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No AI Analysis Message */}
          {!hasAIAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 text-xl flex-shrink-0">ℹ️</span>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Basic Repository Analysis
                  </h4>
                  <p className="text-blue-700 text-sm mb-2">
                    This analysis shows basic repository information and code
                    changes. For AI-powered insights, risk assessment, and
                    recommendations, please provide your API keys.
                  </p>
                  <p className="text-blue-600 text-xs">
                    💡 Available: File changes, statistics, and diff viewing
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Hotspots - Only show for AI analysis */}
          {hasAIAnalysis && aiData.risk.hotspots.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">
                AI-Identified Hotspots
              </h4>
              <div className="space-y-2">
                {aiData.risk.hotspots.map((hotspot, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="font-medium text-yellow-800">
                      {hotspot.file}
                    </div>
                    <div className="text-sm text-yellow-700">
                      {hotspot.notes}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Merge Section */}
          {enableMergeFeature && results.pr_meta && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold flex items-center">
                  🔀 One-Click Merge
                  {!mergePermissionsVerified && (
                    <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      Permissions Required
                    </span>
                  )}
                </h4>
                {mergePermissionsVerified && (
                  <span className="text-green-600 text-sm flex items-center">
                    ✅ Ready to merge
                  </span>
                )}
              </div>

              {!mergePermissionsVerified ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 text-sm mb-2">
                    ⚠️ To enable merge functionality, please verify your GitHub
                    token has the required permissions in Settings.
                  </p>
                  <p className="text-amber-700 text-xs">
                    Required: <code>repo</code>,{" "}
                    <code>pull_requests:write</code>,{" "}
                    <code>contents:write</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Risk Warning */}
                  {hasAIAnalysis && aiData.risk.score > 50 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-amber-600 mr-2">⚠️</span>
                        <span className="font-medium text-amber-800">
                          {aiData.risk.score > 70
                            ? "High Risk PR"
                            : "Medium Risk PR"}
                        </span>
                      </div>
                      <p className="text-amber-700 text-sm">
                        Risk Score: {aiData.risk.score}/100. Please review
                        carefully before merging.
                      </p>
                    </div>
                  )}

                  {/* Merge Options */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Merge Strategy
                        </label>
                        <button
                          onClick={() => {
                            window.history.pushState(
                              {},
                              "",
                              "/merge-strategies"
                            );
                            window.dispatchEvent(new PopStateEvent("popstate"));
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Know Your Merge →
                        </button>
                      </div>
                      <select
                        value={mergeStrategy}
                        onChange={(e) =>
                          setMergeStrategy(
                            e.target.value as "merge" | "squash" | "rebase"
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        title="Choose how commits will be merged into the target branch"
                      >
                        <option value="squash">
                          🗜️ Squash and merge (Recommended)
                        </option>
                        <option value="merge">🔀 Create a merge commit</option>
                        <option value="rebase">🔄 Rebase and merge</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {mergeStrategy === "squash" &&
                          "Combines all commits into one clean commit"}
                        {mergeStrategy === "merge" &&
                          "Preserves all commits and creates a merge commit"}
                        {mergeStrategy === "rebase" &&
                          "Creates linear history with all individual commits"}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={deleteBranch}
                          onChange={(e) => setDeleteBranch(e.target.checked)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Delete branch after merge
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={includeAnalysis}
                          onChange={(e) => setIncludeAnalysis(e.target.checked)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Include analysis in commit message
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Merge Button */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleMergePR}
                      disabled={isMerging}
                      className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                        hasAIAnalysis && aiData.risk.score > 70
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-green-600 hover:bg-green-700"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isMerging ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Merging...
                        </span>
                      ) : (
                        `🔀 Merge Pull Request (${mergeStrategy})`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "checklist" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Reviewer Checklist</h3>
            <button
              onClick={() =>
                copyToClipboard(
                  [
                    ...aiData.reviewer_checklist.blocking_items,
                    ...aiData.reviewer_checklist.non_blocking_items,
                  ]
                    .map((item) => `- [ ] ${item}`)
                    .join("\n")
                )
              }
              className="btn-secondary text-sm"
            >
              Copy Checklist
            </button>
          </div>

          {aiData.reviewer_checklist.blocking_items.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3 text-red-700">
                Blocking Items
              </h4>
              <div className="space-y-2">
                {aiData.reviewer_checklist.blocking_items.map((item, index) => (
                  <label
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <input type="checkbox" className="mt-1 text-red-600" />
                    <span className="text-red-800">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {aiData.reviewer_checklist.non_blocking_items.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3 text-blue-700">
                Non-blocking Items
              </h4>
              <div className="space-y-2">
                {aiData.reviewer_checklist.non_blocking_items.map(
                  (item, index) => (
                    <label
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <input type="checkbox" className="mt-1 text-blue-600" />
                      <span className="text-blue-800">{item}</span>
                    </label>
                  )
                )}
              </div>
            </div>
          )}

          {/* Questions for Author */}
          {aiData.questions_for_author.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3">Questions for Author</h4>
              <ul className="space-y-2">
                {aiData.questions_for_author.map((question, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-blue-600 mt-1">?</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "tests" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Tests & Plan</h3>

          {/* Missing Tests */}
          {aiData.missing_tests.length > 0 && (
            <div>
              <h4 className="text-md font-medium mb-3 text-orange-700">
                Missing Tests
              </h4>
              <ul className="space-y-2">
                {aiData.missing_tests.map((test, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <span className="text-orange-600 mt-1">⚠</span>
                    <span className="text-orange-800">{test}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Plan */}
          <div>
            <h4 className="text-md font-medium mb-3">Generated Test Plan</h4>

            {aiData.generated_test_plan.unit.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Unit Tests
                </h5>
                <ul className="space-y-1">
                  {aiData.generated_test_plan.unit.map((test, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-sm">{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiData.generated_test_plan.integration.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Integration Tests
                </h5>
                <ul className="space-y-1">
                  {aiData.generated_test_plan.integration.map((test, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 mt-1">⚡</span>
                      <span className="text-sm">{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiData.generated_test_plan.manual.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Manual Testing
                </h5>
                <ul className="space-y-1">
                  {aiData.generated_test_plan.manual.map((test, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-purple-600 mt-1">👤</span>
                      <span className="text-sm">{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Commands to Run */}
          {aiData.commands_to_run.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-medium">Commands to Run</h4>
                <button
                  onClick={() =>
                    copyToClipboard(aiData.commands_to_run.join("\n"))
                  }
                  className="btn-secondary text-sm"
                >
                  Copy Commands
                </button>
              </div>
              <div className="code-block">
                {aiData.commands_to_run.map((command, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">$ </span>
                    <span>{command}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "changes" && (
        <div className="space-y-6">
          <DiffViewer files={results.files || []} />
        </div>
      )}

      {activeTab === "usage" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Daily Usage Stats</h3>
          <SimpleUsageStats />
        </div>
      )}

      {activeTab === "comment" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Review Comment</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(results.markdown.review_comment)}
                className="btn-secondary text-sm"
              >
                Copy Markdown
              </button>
              {onPostComment && results.pr_meta.number > 0 && (
                <button
                  onClick={handlePostComment}
                  disabled={isPostingComment || !tokenForComment.trim()}
                  className="btn-primary text-sm"
                >
                  {isPostingComment ? "Posting..." : "Post to GitHub"}
                </button>
              )}
            </div>
          </div>

          {/* GitHub Token for Posting */}
          {onPostComment && results.pr_meta.number > 0 && (
            <div>
              <label
                htmlFor="comment_token"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                GitHub Token (for posting)
              </label>
              <input
                id="comment_token"
                type="password"
                value={tokenForComment}
                onChange={(e) => setTokenForComment(e.target.value)}
                placeholder="Required to post comments"
                className="input-field"
              />
            </div>
          )}

          {/* Markdown Preview */}
          <div className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                Markdown Preview
              </span>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border overflow-x-auto">
                {results.markdown.review_comment}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
