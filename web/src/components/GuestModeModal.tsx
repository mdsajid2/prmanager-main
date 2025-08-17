import React, { useEffect } from "react";

interface GuestModeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GuestModeModal: React.FC<GuestModeModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🔑</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Continue as Guest?
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            You're about to use PR Manager without an account
          </p>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <span className="text-amber-600 text-lg sm:text-xl flex-shrink-0">
              ⚠️
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-amber-800 mb-2 text-sm sm:text-base">
                Important Limitations
              </h3>
              <ul className="text-amber-700 text-xs sm:text-sm space-y-1">
                <li>
                  • <strong>No Free AI Analysis</strong> - You must provide your
                  own API keys
                </li>
                <li>
                  • <strong>Local Storage Only</strong> - Settings won't sync
                  across devices
                </li>
                <li>
                  • <strong>No Usage Tracking</strong> - No monthly limits or
                  statistics
                </li>
                <li>
                  • <strong>No Cloud Backup</strong> - Tokens stored in browser
                  only
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Keys Required */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <span className="text-blue-600 text-lg sm:text-xl flex-shrink-0">
              🤖
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">
                AI Analysis Requires Your API Keys
              </h3>
              <p className="text-blue-700 text-xs sm:text-sm mb-2">
                To use AI-powered analysis, you'll need to provide your own:
              </p>
              <ul className="text-blue-700 text-xs sm:text-sm space-y-1">
                <li>
                  • OpenAI API Key (for GPT analysis) -{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Get key
                  </a>
                </li>
                <li>
                  • Anthropic API Key (for Claude analysis) -{" "}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Get key
                  </a>
                </li>
                <li>
                  • Google Gemini API Key (for Gemini analysis) -{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Get key
                  </a>
                </li>
                <li>
                  • GitHub Token (for private repositories) -{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Get token
                  </a>
                </li>
              </ul>
              <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 text-xs sm:text-sm font-medium">
                  💡 <strong>Don't want to provide API keys?</strong> Create a
                  free account to get{" "}
                  <strong>10 free AI analyses per day</strong> with our system
                  keys!
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Limit resets daily at 12:00 AM EST
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What Still Works */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <span className="text-green-600 text-lg sm:text-xl flex-shrink-0">
              ✅
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">
                What Still Works
              </h3>
              <ul className="text-green-700 text-xs sm:text-sm space-y-1">
                <li>• Heuristic analysis (risk scoring without AI)</li>
                <li>• Diff viewing and file analysis</li>
                <li>• Merge strategies guide</li>
                <li>• All UI features and tools</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-green-300 text-green-700 rounded-lg font-semibold hover:border-green-400 hover:bg-green-50 transition-all text-sm sm:text-base"
          >
            Create Account (Free AI!)
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm sm:text-base"
          >
            Continue as Guest
          </button>
        </div>

        {/* Fine Print */}
        <p className="text-xs text-gray-500 text-center mt-3 sm:mt-4">
          You can always create an account later to unlock{" "}
          <strong>10 free AI analyses per day</strong> (no API keys needed) and
          cloud storage
        </p>
      </div>
    </div>
  );
};
