import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { InputCard } from "./InputCard";
import { ResultsTabs } from "./ResultsTabs";
import { SettingsModal, UserSettings } from "./SettingsModal";

import { LogoWithText } from "./Logo";
import { getThemeClasses, getThemeGradientClass } from "./ThemeSelector";
import { api, AnalyzeRequest, AnalyzeResponse } from "../lib/api";

interface LoadingState {
  isLoading: boolean;
  step: string;
  progress: number;
}

const getDefaultSettings = (isGuest: boolean): UserSettings => ({
  aiProvider: isGuest ? "openai" : "system", // Guests cannot use system provider
  apiKey: "",
  githubToken: "",
  useSystemKeys: !isGuest, // Guests cannot use system keys
  theme: "blue",
  enableMergeFeature: false,
  mergePermissionsVerified: false,
});

export const Dashboard: React.FC = () => {
  const { user, logout, isGuest } = useAuth();
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    step: "",
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(
    getDefaultSettings(isGuest)
  );

  // Load settings from localStorage on mount (user-specific or guest)
  React.useEffect(() => {
    if (user?.id) {
      const settingsKey = isGuest
        ? "pr-manager-guest-settings"
        : `pr-manager-settings-${user.id}`;
      const savedSettings = localStorage.getItem(settingsKey);

      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          // For guest mode, ensure they can't use system provider or keys
          if (isGuest) {
            parsedSettings.useSystemKeys = false;
            if (parsedSettings.aiProvider === "system") {
              parsedSettings.aiProvider = "openai";
            }
          }
          setUserSettings(parsedSettings);
        } catch (e) {
          console.error("Failed to load settings:", e);
          setUserSettings(getDefaultSettings(isGuest));
        }
      } else {
        // Check for legacy global settings and clean them up
        const legacySettings = localStorage.getItem("pr-manager-settings");
        if (legacySettings) {
          console.log("🧹 Cleaning up legacy global settings");
          localStorage.removeItem("pr-manager-settings");
        }

        // Reset to default settings
        setUserSettings({
          ...getDefaultSettings(isGuest),
          githubToken: "", // Ensure no token for new users
        });
      }
    }
  }, [user?.id, isGuest]);

  // Additional effect to handle guest mode changes and ensure proper settings
  React.useEffect(() => {
    if (isGuest && userSettings.aiProvider === "system") {
      console.log(
        "🔒 Guest user detected with system provider - switching to OpenAI"
      );
      setUserSettings((prev) => ({
        ...prev,
        aiProvider: "openai",
        useSystemKeys: false,
      }));
    }
  }, [isGuest, userSettings.aiProvider]);

  // Add global function for clearing settings (for testing)
  React.useEffect(() => {
    (window as any).clearPRManagerSettings = () => {
      localStorage.removeItem("pr-manager-guest-settings");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("pr-manager-settings-")) {
          localStorage.removeItem(key);
        }
      });
      console.log("🧹 Cleared all PR Manager settings. Refresh the page.");
    };
  }, []);

  // Save settings to localStorage (user-specific or guest)
  const handleSaveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    if (user?.id) {
      const settingsKey = isGuest
        ? "pr-manager-guest-settings"
        : `pr-manager-settings-${user.id}`;
      localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    }
  };

  const handleAnalyze = async (
    request: AnalyzeRequest & { ai_provider?: string; ai_api_key?: string }
  ) => {
    setError(null);
    setResults(null);
    setLoading({
      isLoading: true,
      step: "Initializing analysis...",
      progress: 10,
    });

    try {
      // Simulate realistic loading steps with progress
      const steps = [
        { step: "Connecting to GitHub...", progress: 20, delay: 800 },
        { step: "Fetching PR data...", progress: 40, delay: 1200 },
        { step: "Analyzing code changes...", progress: 60, delay: 1000 },
        { step: "Calculating risk score...", progress: 80, delay: 800 },
        { step: "Generating insights...", progress: 95, delay: 1000 },
      ];

      for (const { step, progress, delay } of steps) {
        setLoading({ isLoading: true, step, progress });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await api.analyze(request);
      setResults(response);
    } catch (err) {
      console.error("Analysis error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during analysis");
      }
    } finally {
      setLoading({ isLoading: false, step: "", progress: 0 });
    }
  };

  const handlePostComment = async (
    commentMarkdown: string,
    githubToken: string
  ) => {
    if (!results?.pr_meta || results.pr_meta.number === 0) {
      alert("Cannot post comment: No valid PR found");
      return;
    }

    // Construct PR URL from metadata (this is a simplification)
    const prUrl = `https://github.com/owner/repo/pull/${results.pr_meta.number}`;

    setIsPostingComment(true);
    try {
      await api.postComment({
        pr_url: prUrl,
        comment_markdown: commentMarkdown,
        github_token: githubToken,
      });
      alert("Comment posted successfully! 🎉");
    } catch (err) {
      console.error("Comment posting error:", err);
      if (err instanceof Error) {
        alert(`Failed to post comment: ${err.message}`);
      } else {
        alert("Failed to post comment: Unknown error");
      }
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setLoading({ isLoading: false, step: "", progress: 0 });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={`min-h-screen ${getThemeClasses(userSettings.theme)}`}>
      {/* Header with Logo */}
      <header className="sticky top-0 z-30 header-blur">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="logo-glow">
              <LogoWithText size="md" theme={userSettings.theme} />
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {user?.first_name || user?.email}
                  </div>
                  <div className="text-gray-500">
                    {user?.api_usage_count || 0}/{user?.api_usage_limit || 100}{" "}
                    API calls
                  </div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                  {(
                    user?.first_name?.[0] ||
                    user?.email?.[0] ||
                    "U"
                  ).toUpperCase()}
                </div>
              </div>

              {!results && !loading.isLoading && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="btn-secondary text-sm"
                  >
                    ⚙️ Settings
                  </button>
                  {user?.email === "mdsajid8636@gmail.com" && (
                    <button
                      onClick={() => (window.location.href = "/admin")}
                      className="btn-secondary text-sm bg-purple-600 text-white hover:bg-purple-700"
                    >
                      🛠️ Admin
                    </button>
                  )}
                </div>
              )}
              {results && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="btn-secondary"
                  >
                    ⚙️ Settings
                  </button>
                  <button onClick={handleReset} className="btn-primary">
                    🔄 New Analysis
                  </button>
                  {user?.email === "mdsajid8636@gmail.com" && (
                    <button
                      onClick={() => {
                        window.history.pushState({}, "", "/admin");
                        window.dispatchEvent(new PopStateEvent("popstate"));
                      }}
                      className="btn-secondary bg-purple-600 text-white hover:bg-purple-700"
                    >
                      🛠️ Admin
                    </button>
                  )}
                </div>
              )}
              <button onClick={handleLogout} className="btn-secondary text-sm">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Message */}
        {!results && !loading.isLoading && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isGuest
                ? "Welcome, Guest! 👋"
                : `Welcome back, ${user?.first_name || "Developer"}! 👋`}
            </h1>
            <p className="text-gray-600">
              {isGuest
                ? "Try PR Manager with your own API keys - no account required!"
                : "Ready to analyze your next pull request?"}
            </p>
            {isGuest && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 max-w-2xl mx-auto">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <span className="text-sm">🔑</span>
                  <span className="text-sm font-medium">Guest Mode Active</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Add your own API keys in Settings to use AI analysis. All
                  other features work normally.
                </p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add API Keys
                </button>
              </div>
            )}
          </div>
        )}

        {/* Daily Usage Stats for logged-in users */}

        {/* Loading State */}
        {loading.isLoading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="card max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="spinner border-4 border-blue-200 border-t-blue-600"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {loading.step}
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${loading.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {loading.progress}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card mb-8 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-red-800 mb-2">
                  Analysis Failed
                </h3>
                <p className="text-red-700 mb-4 whitespace-pre-line">{error}</p>
                <div className="flex space-x-3">
                  <button onClick={handleReset} className="btn-secondary">
                    Try Again
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="btn-secondary"
                  >
                    Check Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && !loading.isLoading && (
          <div className="space-y-8">
            <div className="text-center">
              <h2
                className={`text-3xl font-bold ${getThemeGradientClass(
                  userSettings.theme
                )}`}
              >
                📊 Analysis Results
              </h2>
              <p className="text-gray-600 mt-1">
                AI-powered insights for your pull request
              </p>
            </div>

            <ResultsTabs
              results={results}
              onPostComment={handlePostComment}
              isPostingComment={isPostingComment}
              githubToken={userSettings.githubToken}
              enableMergeFeature={userSettings.enableMergeFeature}
              mergePermissionsVerified={userSettings.mergePermissionsVerified}
            />
          </div>
        )}

        {/* Input Form */}
        {!results && !loading.isLoading && (
          <InputCard
            onAnalyze={handleAnalyze}
            isLoading={loading.isLoading}
            userSettings={userSettings}
          />
        )}

        {/* Footer */}
        <footer className="mt-20 text-center">
          <div className="glass-card p-6 max-w-2xl mx-auto">
            <p className="text-gray-600 mb-2">
              © 2025 PR Manager - AI-Powered Pull Request Analysis
            </p>
            <p className="text-sm text-gray-500">
              Empowering developers with intelligent code review insights
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500 mt-3">
              <button
                onClick={() => {
                  window.history.pushState({}, "", "/merge-strategies");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="hover:text-blue-600 transition-colors"
              >
                Know Your Merge
              </button>
              <a href="#" className="hover:text-blue-600 transition-colors">
                About
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                Privacy
              </a>
              <a
                href="https://github.com/mdsajid2/prmanager"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        currentSettings={userSettings}
      />
    </div>
  );
};
