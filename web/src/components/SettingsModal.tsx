import React, { useState, useEffect } from "react";
import { ThemeSelector, Theme } from "./ThemeSelector";
import { useAuth } from "../contexts/AuthContext";
import { tokensAPI } from "../lib/tokens-api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
  currentSettings: UserSettings;
}

export interface UserSettings {
  aiProvider: "system" | "openai" | "anthropic" | "gemini";
  apiKey: string;
  githubToken: string;
  useSystemKeys: boolean;
  theme: Theme;
  enableMergeFeature: boolean;
  mergePermissionsVerified: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings,
}) => {
  const [settings, setSettings] = useState<UserSettings>(currentSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [tokenStorageOption, setTokenStorageOption] = useState<
    "temporary" | "persistent"
  >("temporary");
  const [isStoringToken, setIsStoringToken] = useState(false);

  const { user, isGuest } = useAuth();

  useEffect(() => {
    let updatedSettings = { ...currentSettings };

    // Force temporary storage for guests
    if (isGuest) {
      setTokenStorageOption("temporary");

      // Guest users cannot use system keys
      updatedSettings.useSystemKeys = false;

      // If guest user has system provider, default to openai
      if (updatedSettings.aiProvider === "system") {
        console.log(
          "🔒 Guest user in settings with system provider - switching to OpenAI"
        );
        updatedSettings.aiProvider = "openai";
      }
    }

    setSettings(updatedSettings);
  }, [currentSettings, isGuest]);

  // Verify GitHub token has merge permissions
  const handleVerifyMergePermissions = async () => {
    if (!settings.githubToken) {
      alert("Please add a GitHub token first");
      return;
    }

    setIsStoringToken(true);
    try {
      // Test GitHub API with the token to check permissions
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${settings.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid GitHub token");
      }

      // Check token scopes in response headers
      const scopes = response.headers.get("x-oauth-scopes") || "";
      const hasRepoScope =
        scopes.includes("repo") || scopes.includes("public_repo");

      if (hasRepoScope) {
        setSettings({
          ...settings,
          mergePermissionsVerified: true,
        });
        alert(
          "✅ GitHub token permissions verified! Merge feature is ready to use."
        );
      } else {
        setSettings({
          ...settings,
          mergePermissionsVerified: false,
        });
        alert(
          "❌ GitHub token missing required permissions. Please create a new token with 'repo' scope."
        );
      }
    } catch (error) {
      console.error("Permission verification failed:", error);
      setSettings({
        ...settings,
        mergePermissionsVerified: false,
      });
      alert("❌ Failed to verify permissions. Please check your GitHub token.");
    } finally {
      setIsStoringToken(false);
    }
  };

  // Handle storing token securely (GitHub + AI tokens)
  const handleStoreToken = async (
    tokenType: "github" | "openai" | "anthropic" | "gemini"
  ) => {
    if (!user) return;

    let token = "";
    let tokenName = "";

    switch (tokenType) {
      case "github":
        if (!settings.githubToken) return;
        token = settings.githubToken;
        tokenName = "GitHub Personal Access Token";
        break;
      case "openai":
        if (!settings.apiKey || settings.aiProvider !== "openai") return;
        token = settings.apiKey;
        tokenName = "OpenAI API Key";
        break;
      case "anthropic":
        if (!settings.apiKey || settings.aiProvider !== "anthropic") return;
        token = settings.apiKey;
        tokenName = "Anthropic API Key";
        break;
      case "gemini":
        if (!settings.apiKey || settings.aiProvider !== "gemini") return;
        token = settings.apiKey;
        tokenName = "Google Gemini API Key";
        break;
    }

    setIsStoringToken(true);
    try {
      const authToken = localStorage.getItem("auth_token");
      if (!authToken) throw new Error("Not authenticated");

      await tokensAPI.storeToken(authToken, {
        tokenType,
        token,
        tokenName,
      });

      // Token stored successfully
      alert(
        `✅ ${tokenName} stored securely! It will be used automatically for API calls.`
      );
    } catch (error) {
      console.error("Failed to store token:", error);
      alert("❌ Failed to store token. Please try again.");
    } finally {
      setIsStoringToken(false);
    }
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const allAiProviders = [
    {
      id: "system" as const,
      name: "System Default",
      description: "Use server-configured AI provider",
      icon: "🏢",
      cost: "Free",
    },
    {
      id: "openai" as const,
      name: "OpenAI GPT-4",
      description: "Best quality for code analysis",
      icon: "🤖",
      cost: "~$0.01-0.03 per analysis",
    },
    {
      id: "anthropic" as const,
      name: "Anthropic Claude",
      description: "Great for detailed analysis",
      icon: "🧠",
      cost: "~$0.01-0.02 per analysis",
    },
    {
      id: "gemini" as const,
      name: "Google Gemini",
      description: "Budget-friendly option",
      icon: "💎",
      cost: "Free tier available",
    },
  ];

  // Filter out system provider for guest users
  const aiProviders = isGuest
    ? allAiProviders.filter((provider) => provider.id !== "system")
    : allAiProviders;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold gradient-text">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Guest Mode Notice */}
        {isGuest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-600">🔑</span>
              <h3 className="font-semibold text-blue-800">
                Guest Mode Settings
              </h3>
            </div>
            <p className="text-blue-700 text-sm mb-3">
              You're using PR Manager as a guest. Add your own API keys below to
              enable AI analysis. All other features work normally without an
              account.
            </p>
            <div className="bg-blue-100 rounded p-3">
              <p className="text-blue-800 text-xs mb-2">
                <strong>Storage Limitations:</strong> In guest mode, all
                settings and tokens are stored locally only.
              </p>
              <ul className="text-blue-800 text-xs space-y-1">
                <li>• No database storage available</li>
                <li>• Settings won't sync across devices</li>
                <li>• Tokens stored in browser only</li>
                <li>• Create an account for secure cloud storage</li>
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* AI Provider Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🤖 AI Provider
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiProviders.map((provider) => (
                <div
                  key={provider.id}
                  className={`card-compact cursor-pointer transition-all duration-200 ${
                    settings.aiProvider === provider.id
                      ? "ring-2 ring-blue-500 bg-blue-50/50"
                      : "hover:bg-gray-50/50"
                  }`}
                  onClick={() => {
                    // Prevent guests from selecting system provider
                    if (isGuest && provider.id === "system") {
                      console.warn(
                        "🔒 Guest users cannot select system provider"
                      );
                      return;
                    }
                    setSettings({ ...settings, aiProvider: provider.id });
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {provider.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">
                        {provider.description}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        {provider.cost}
                      </p>
                      {provider.id !== "system" && (
                        <a
                          href={
                            provider.id === "openai"
                              ? "https://platform.openai.com/api-keys"
                              : provider.id === "anthropic"
                              ? "https://console.anthropic.com/"
                              : provider.id === "gemini"
                              ? "https://makersuite.google.com/app/apikey"
                              : "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-blue-600 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          → Generate key here
                        </a>
                      )}
                    </div>
                    {settings.aiProvider === provider.id && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Guest User Message */}
            {isGuest && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="text-green-600 text-xl flex-shrink-0">
                    💡
                  </span>
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">
                      Want Free AI Analysis?
                    </h4>
                    <p className="text-green-700 text-sm mb-2">
                      Create a free account to get{" "}
                      <strong>10 free AI analyses per day</strong> with our
                      system keys!
                    </p>
                    <p className="text-green-600 text-xs mb-1">
                      Includes OpenAI, Anthropic, and Gemini • No API keys
                      needed
                    </p>
                    <p className="text-green-600 text-xs">
                      Daily limit resets at 12:00 AM EST
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* API Key Configuration */}
          {settings.aiProvider !== "system" && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                🔑 API Key Configuration
              </h3>

              <div className="space-y-4">
                {/* System API Key Option - Only for logged-in users */}
                {!isGuest && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useSystemKeys"
                      checked={settings.useSystemKeys}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          useSystemKeys: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <label
                        htmlFor="useSystemKeys"
                        className="text-sm font-medium"
                      >
                        Use system-provided API key (if available) - 10 free
                        analyses per day
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        💡 When daily limit is exhausted, you can use your own
                        API keys for unlimited analysis
                      </p>
                    </div>
                  </div>
                )}

                {/* Guest User Notice */}
                {isGuest && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-800 text-sm">
                      <strong>Guest Mode:</strong> You must provide your own API
                      keys. System keys are only available to registered users.
                    </p>
                  </div>
                )}

                {(!settings.useSystemKeys || isGuest) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {settings.aiProvider === "openai" && "OpenAI API Key"}
                      {settings.aiProvider === "anthropic" &&
                        "Anthropic API Key"}
                      {settings.aiProvider === "gemini" &&
                        "Google Gemini API Key"}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={settings.apiKey}
                        onChange={(e) =>
                          setSettings({ ...settings, apiKey: e.target.value })
                        }
                        placeholder={
                          settings.aiProvider === "openai"
                            ? "sk-..."
                            : settings.aiProvider === "anthropic"
                            ? "sk-ant-..."
                            : "Your API key"
                        }
                        className="input-field pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showApiKey ? "🙈" : "👁️"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Your API key is stored securely in your browser and never
                      sent to our servers
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GitHub Token */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🐙 GitHub Integration
            </h3>

            {/* Security Disclaimer */}
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-amber-600 text-lg">🛡️</span>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-2">
                    Token Security Disclaimer
                  </h4>
                  <p className="text-xs text-amber-700 mb-2">
                    <strong>Your Responsibility:</strong> Keep your GitHub token
                    secure and never share it. We encrypt and protect stored
                    tokens, but you are responsible for token security.
                  </p>
                  <p className="text-xs text-blue-700">
                    💡 <strong>Best Practice:</strong> Create tokens with
                    minimal permissions (read-only access to repositories).
                  </p>
                </div>
              </div>
            </div>

            {/* Token Storage Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Token Storage Options
              </label>
              <div className="space-y-3">
                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    tokenStorageOption === "temporary"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setTokenStorageOption("temporary")}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="tokenStorage"
                      checked={tokenStorageOption === "temporary"}
                      onChange={() => setTokenStorageOption("temporary")}
                      className="mt-1"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        🔄 Temporary (Session Only)
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Token stored in browser memory only. You'll need to
                        re-enter it each session.
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Most secure - no persistent storage
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 border rounded-lg transition-all ${
                    isGuest
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                      : tokenStorageOption === "persistent"
                      ? "border-blue-500 bg-blue-50 cursor-pointer"
                      : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  }`}
                  onClick={() =>
                    !isGuest && setTokenStorageOption("persistent")
                  }
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="tokenStorage"
                      checked={tokenStorageOption === "persistent"}
                      onChange={() =>
                        !isGuest && setTokenStorageOption("persistent")
                      }
                      disabled={isGuest}
                      className="mt-1"
                    />
                    <div>
                      <h4
                        className={`font-medium ${
                          isGuest ? "text-gray-500" : "text-gray-900"
                        }`}
                      >
                        💾 Persistent (Encrypted Database)
                        {isGuest && (
                          <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Login Required
                          </span>
                        )}
                      </h4>
                      <p
                        className={`text-xs mt-1 ${
                          isGuest ? "text-gray-500" : "text-gray-600"
                        }`}
                      >
                        {isGuest
                          ? "Database storage requires a user account. Create an account to save tokens securely."
                          : "Token encrypted and stored securely in our database. Convenient for regular use."}
                      </p>
                      {!isGuest && (
                        <p className="text-xs text-blue-600 mt-1">
                          🔐 AES-256 encrypted + user-specific storage
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token (Optional)
              </label>
              <div className="relative">
                <input
                  type={showGithubToken ? "text" : "password"}
                  value={settings.githubToken}
                  onChange={(e) =>
                    setSettings({ ...settings, githubToken: e.target.value })
                  }
                  placeholder="ghp_..."
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowGithubToken(!showGithubToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showGithubToken ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Storage Action Button */}
              {settings.githubToken &&
                tokenStorageOption === "persistent" &&
                user &&
                !isGuest && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleStoreToken("github")}
                      disabled={isStoringToken}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isStoringToken
                        ? "🔐 Encrypting..."
                        : "💾 Store Securely"}
                    </button>
                  </div>
                )}

              {/* Guest Mode Notice for Database Storage */}
              {isGuest && tokenStorageOption === "persistent" && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-700">
                    <strong>Guest Mode:</strong> Database storage is not
                    available. Your tokens will be stored locally only.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Required for private repositories and to avoid rate limits
                (5000/hour vs 60/hour)
              </p>
            </div>
          </div>

          {/* Theme Selection */}
          <div>
            <ThemeSelector
              currentTheme={settings.theme}
              onThemeChange={(theme) => setSettings({ ...settings, theme })}
            />
          </div>

          {/* Quick Setup Links */}
          <div className="bg-blue-50/50 rounded-xl p-4">
            <h4 className="font-semibold text-blue-900 mb-2">🚀 Quick Setup</h4>
            <div className="space-y-2 text-sm">
              {settings.aiProvider === "openai" && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 block"
                >
                  → Get OpenAI API Key
                </a>
              )}
              {settings.aiProvider === "anthropic" && (
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 block"
                >
                  → Get Anthropic API Key
                </a>
              )}
              {settings.aiProvider === "gemini" && (
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 block"
                >
                  → Get Google Gemini API Key
                </a>
              )}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 block"
              >
                → Get GitHub Token
              </a>
            </div>
          </div>
        </div>

        {/* Merge Feature Toggle */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🔀 One-Click Merge Feature
          </h3>

          <div className="space-y-4">
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="enableMerge"
                  checked={settings.enableMergeFeature}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      enableMergeFeature: e.target.checked,
                      mergePermissionsVerified: false, // Reset verification when toggling
                    });
                  }}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label
                    htmlFor="enableMerge"
                    className="font-medium text-gray-900 cursor-pointer"
                  >
                    Enable One-Click PR Merge
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Merge pull requests directly from PR Manager without
                    switching to GitHub
                  </p>
                </div>
              </div>
            </div>

            {settings.enableMergeFeature && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                  ⚠️ Required GitHub Token Permissions
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  To enable merge functionality, your GitHub token must have
                  these permissions:
                </p>
                <ul className="text-sm text-amber-700 space-y-1 mb-4">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                    <code className="bg-amber-100 px-2 py-1 rounded text-xs">
                      repo
                    </code>{" "}
                    - Full repository access
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                    <code className="bg-amber-100 px-2 py-1 rounded text-xs">
                      pull_requests:write
                    </code>{" "}
                    - Merge pull requests
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                    <code className="bg-amber-100 px-2 py-1 rounded text-xs">
                      contents:write
                    </code>{" "}
                    - Modify repository content
                  </li>
                </ul>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {settings.mergePermissionsVerified ? (
                      <span className="flex items-center text-green-700 text-sm">
                        ✅ Permissions verified
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-700 text-sm">
                        ⏳ Permissions not verified
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleVerifyMergePermissions()}
                    disabled={!settings.githubToken}
                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify Permissions
                  </button>
                </div>
              </div>
            )}

            {settings.enableMergeFeature && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">
                  🎯 What You'll Get
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    Merge PRs directly from analysis results
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    Choose merge strategy (merge, squash, rebase)
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    Risk-aware merge validation
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    No screen switching required
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
