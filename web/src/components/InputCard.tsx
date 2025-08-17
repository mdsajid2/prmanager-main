import React, { useState } from "react";
import { GitHubBrowser } from "./GitHubBrowser";
import { UserSettings } from "./SettingsModal";

interface InputCardProps {
  onAnalyze: (data: {
    pr_url?: string;
    diff_text?: string;
    github_token?: string;
    ai_provider?: string;
    ai_api_key?: string;
  }) => void;
  isLoading: boolean;
  userSettings: UserSettings;
}

export const InputCard: React.FC<InputCardProps> = ({
  onAnalyze,
  isLoading,
  userSettings,
}) => {
  const [inputType, setInputType] = useState<"pr_url" | "diff" | "browse">(
    "pr_url"
  );
  const [prUrl, setPrUrl] = useState("");
  const [diffText, setDiffText] = useState("");
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (inputType === "pr_url" && !prUrl.trim()) {
      alert("Please enter a GitHub PR URL");
      return;
    }

    if (inputType === "diff" && !diffText.trim()) {
      alert("Please paste a diff");
      return;
    }

    // Prepare analysis data with user settings
    const analysisData: any = {
      pr_url: inputType === "pr_url" ? prUrl.trim() : undefined,
      diff_text: inputType === "diff" ? diffText.trim() : undefined,
      github_token: userSettings.githubToken || undefined,
    };

    // Add AI provider settings if user is not using system defaults
    // Guest users (useSystemKeys: false) must always provide their own keys
    if (userSettings.aiProvider !== "system" || !userSettings.useSystemKeys) {
      analysisData.ai_provider = userSettings.aiProvider;
      analysisData.ai_api_key = userSettings.apiKey;
    }

    onAnalyze(analysisData);
  };

  const handlePRSelect = (selectedPrUrl: string) => {
    setPrUrl(selectedPrUrl);
    setInputType("pr_url");

    // Auto-analyze the selected PR
    const analysisData: any = {
      pr_url: selectedPrUrl,
      github_token: userSettings.githubToken || undefined,
    };

    // Add AI provider settings if user is not using system defaults
    // Guest users (useSystemKeys: false) must always provide their own keys
    if (userSettings.aiProvider !== "system" || !userSettings.useSystemKeys) {
      analysisData.ai_provider = userSettings.aiProvider;
      analysisData.ai_api_key = userSettings.apiKey;
    }

    onAnalyze(analysisData);
  };

  const getProviderInfo = () => {
    // System provider should not be available to guests, but add safeguard
    if (userSettings.aiProvider === "system") {
      return { name: "System Default", icon: "🏢", color: "text-gray-600" };
    }
    const providers = {
      openai: { name: "OpenAI GPT-4", icon: "🤖", color: "text-green-600" },
      anthropic: {
        name: "Anthropic Claude",
        icon: "🧠",
        color: "text-purple-600",
      },
      gemini: { name: "Google Gemini", icon: "💎", color: "text-blue-600" },
    };
    return providers[userSettings.aiProvider] || providers.openai;
  };

  const providerInfo = getProviderInfo();

  return (
    <>
      <div className="card floating-card">
        {/* Header */}
        <div className="text-center mb-8">
          <h2
            className={`text-3xl font-bold gradient-text-${userSettings.theme} mb-3`}
          >
            AI-Powered Code Review Analysis
          </h2>
          <p className="text-l text-gray-600 mb-6">
            Get instant risk assessments, actionable review checklists, and
            ready-to-use test plans to streamline your project quality and
            compliance.
          </p>

          {/* Provider Status */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 bg-white/50 rounded-full px-4 py-2">
              <span className="text-lg">{providerInfo.icon}</span>
              <span className={`text-sm font-medium ${providerInfo.color}`}>
                Using {providerInfo.name}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Input Type Selection */}
          <div className="flex space-x-2 bg-white/30 backdrop-blur-sm p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => setInputType("pr_url")}
              className={`tab-button flex-1 ${
                inputType === "pr_url" ? "active" : "inactive"
              }`}
            >
              🔗 PR URL
            </button>
            <button
              type="button"
              onClick={() => setShowGitHubBrowser(true)}
              className={`tab-button flex-1 ${
                !userSettings.githubToken ? "inactive opacity-75" : "inactive"
              }`}
              title={
                !userSettings.githubToken
                  ? "Configure GitHub token in Settings to browse repositories"
                  : "Browse your GitHub repositories"
              }
            >
              📁 Browse Repos
              {!userSettings.githubToken && (
                <span className="text-xs ml-1">⚠️</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setInputType("diff")}
              className={`tab-button flex-1 ${
                inputType === "diff" ? "active" : "inactive"
              }`}
            >
              📝 Paste Diff
            </button>
          </div>

          {/* Input Fields */}
          {inputType === "pr_url" ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="pr_url"
                  className="block text-lg font-semibold text-gray-800 mb-3"
                >
                  🔗 GitHub Pull Request URL
                </label>
                <input
                  id="pr_url"
                  type="url"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="input-field text-lg"
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <span className="mr-2">💡</span>
                  Enter any GitHub PR URL - public repos work without tokens
                </p>
              </div>

              {!userSettings.githubToken && (
                <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-sm text-yellow-800 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Configure a GitHub token in Settings to access private repos
                    and avoid rate limits
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label
                htmlFor="diff_text"
                className="block text-lg font-semibold text-gray-800 mb-3"
              >
                📝 Unified Diff
              </label>
              <textarea
                id="diff_text"
                value={diffText}
                onChange={(e) => setDiffText(e.target.value)}
                placeholder="Paste your git diff output here..."
                rows={16}
                className="textarea-field text-sm font-mono"
                disabled={isLoading}
              />
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <span className="mr-2">💡</span>
                Works offline - paste output from `git diff` command
              </p>
            </div>
          )}

          {/* Analyze Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center space-x-3"
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <span>Analyzing with AI...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Analyze Pull Request</span>
              </>
            )}
          </button>
        </form>

        {/* Features Preview */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            ✨ What you'll get
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-700">
                Risk Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-gray-700">
                Review Checklist
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🧪</div>
              <div className="text-sm font-medium text-gray-700">Test Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm font-medium text-gray-700">
                AI Insights
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Browser Modal */}
      <GitHubBrowser
        isOpen={showGitHubBrowser}
        onClose={() => setShowGitHubBrowser(false)}
        onSelectPR={handlePRSelect}
        githubToken={userSettings.githubToken}
      />
    </>
  );
};
