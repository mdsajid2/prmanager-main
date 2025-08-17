import React from "react";
import { LogoWithText } from "./Logo";

interface DocumentationPageProps {
  onBack: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <LogoWithText size="md" theme="blue" />
            <button
              onClick={onBack}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            📚 Documentation
          </h1>

          {/* Getting Started */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              🚀 Getting Started
            </h2>
            <div className="prose prose-blue max-w-none">
              <p className="text-gray-600 mb-4">
                PR Manager is an AI-powered code review platform that helps
                developers analyze pull requests, identify risks, and generate
                comprehensive review insights.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Step 1: Create an Account
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
                <li>Click "Get Started" on the homepage</li>
                <li>
                  Fill in your email, password, and optional profile information
                </li>
                <li>Click "Create Account" to sign up</li>
                <li>You'll be automatically logged in to the dashboard</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Step 2: Analyze a Pull Request
              </h3>
              <p className="text-gray-600 mb-4">
                There are three ways to analyze a PR:
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">
                  🔗 Method 1: PR URL
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>
                    Copy any GitHub PR URL (e.g.,
                    https://github.com/owner/repo/pull/123)
                  </li>
                  <li>Paste it in the "PR URL" tab</li>
                  <li>Click "Analyze Pull Request"</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-900 mb-2">
                  📁 Method 2: Browse Repositories
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-green-800">
                  <li>Configure your GitHub token in Settings (⚙️)</li>
                  <li>Click "Browse Repos" tab</li>
                  <li>Select a repository from your list</li>
                  <li>Choose a pull request to analyze</li>
                </ol>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-purple-900 mb-2">
                  📝 Method 3: Paste Diff
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-purple-800">
                  <li>
                    Run{" "}
                    <code className="bg-purple-100 px-1 rounded">git diff</code>{" "}
                    in your terminal
                  </li>
                  <li>Copy the output</li>
                  <li>Click "Paste Diff" tab</li>
                  <li>Paste the diff and click "Analyze Pull Request"</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              ✨ Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📊 Risk Assessment
                </h3>
                <p className="text-blue-800 text-sm">
                  AI analyzes your code changes and assigns a risk score from
                  1-100 based on complexity, security implications, and
                  potential impact.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  ✅ Review Checklist
                </h3>
                <p className="text-green-800 text-sm">
                  Get a comprehensive checklist of items to review, including
                  blocking and non-blocking issues tailored to your specific
                  changes.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">
                  🧪 Test Plan Generation
                </h3>
                <p className="text-purple-800 text-sm">
                  Automatically generates test scenarios, edge cases, and
                  validation steps based on your code changes.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
                <h3 className="font-semibent text-orange-900 mb-2">
                  🤖 AI Insights
                </h3>
                <p className="text-orange-800 text-sm">
                  Powered by advanced AI models to provide intelligent analysis,
                  suggestions, and questions for the author.
                </p>
              </div>
            </div>
          </section>

          {/* GitHub Integration */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              🐙 GitHub Integration
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-4">
                Creating a Read-Only GitHub Token (Recommended)
              </h3>

              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">
                  🔒 Why Read-Only?
                </h4>
                <p className="text-green-800 text-sm mb-2">
                  For maximum security, create a token with minimal permissions.
                  PR Manager only needs to <strong>read</strong> your
                  repositories and pull requests - it never modifies your code.
                </p>
              </div>

              <h4 className="font-semibold text-yellow-900 mb-3">
                Step-by-Step Token Creation:
              </h4>
              <ol className="list-decimal list-inside space-y-3 text-yellow-800">
                <li>
                  <strong>Go to GitHub Settings:</strong>
                  <br />
                  <span className="text-sm">
                    GitHub.com → Your Profile → Settings → Developer settings →
                    Personal access tokens → Tokens (classic)
                  </span>
                </li>

                <li>
                  <strong>Generate New Token:</strong>
                  <br />
                  <span className="text-sm">
                    Click "Generate new token (classic)" button
                  </span>
                </li>

                <li>
                  <strong>Configure Token Settings:</strong>
                  <div className="ml-4 mt-2 space-y-2">
                    <div className="bg-yellow-100 p-3 rounded">
                      <p className="text-sm font-medium">
                        📝 <strong>Note:</strong> PR Manager Read-Only Access
                      </p>
                      <p className="text-sm">
                        🗓️ <strong>Expiration:</strong> 90 days (recommended) or
                        custom
                      </p>
                    </div>
                  </div>
                </li>

                <li>
                  <strong>Select Minimal Scopes (Read-Only):</strong>
                  <div className="ml-4 mt-2">
                    <div className="bg-white border border-yellow-300 rounded p-3">
                      <p className="text-sm font-semibold mb-2">
                        ✅ For Public Repositories Only:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>
                          ☑️{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            public_repo
                          </code>{" "}
                          - Access public repositories
                        </li>
                      </ul>

                      <p className="text-sm font-semibold mb-2 mt-4">
                        ✅ For Private Repositories:
                      </p>
                      <ul className="text-sm space-y-1 ml-4">
                        <li>
                          ☑️{" "}
                          <code className="bg-gray-100 px-1 rounded">repo</code>{" "}
                          - Full control of private repositories
                        </li>
                        <li className="text-xs text-gray-600 ml-4">
                          ⚠️ This includes read/write, but PR Manager only uses
                          read access
                        </li>
                      </ul>

                      <p className="text-sm font-semibold mb-2 mt-4">
                        ❌ Do NOT select these (not needed):
                      </p>
                      <ul className="text-sm space-y-1 ml-4 text-red-700">
                        <li>
                          ❌{" "}
                          <code className="bg-red-100 px-1 rounded">
                            workflow
                          </code>{" "}
                          - Update GitHub Actions
                        </li>
                        <li>
                          ❌{" "}
                          <code className="bg-red-100 px-1 rounded">
                            write:packages
                          </code>{" "}
                          - Upload packages
                        </li>
                        <li>
                          ❌{" "}
                          <code className="bg-red-100 px-1 rounded">
                            delete_repo
                          </code>{" "}
                          - Delete repositories
                        </li>
                        <li>
                          ❌{" "}
                          <code className="bg-red-100 px-1 rounded">
                            admin:*
                          </code>{" "}
                          - Administrative access
                        </li>
                      </ul>
                    </div>
                  </div>
                </li>

                <li>
                  <strong>Generate and Copy Token:</strong>
                  <br />
                  <span className="text-sm">
                    Click "Generate token" → Copy the token immediately (you
                    won't see it again!)
                  </span>
                </li>

                <li>
                  <strong>Add to PR Manager:</strong>
                  <br />
                  <span className="text-sm">
                    In PR Manager → Settings (⚙️) → Paste token → Save settings
                  </span>
                </li>
              </ol>

              <div className="mt-6 space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Pro Tip:</strong> Set token expiration to 90 days
                    and add a calendar reminder to renew it. This ensures your
                    access doesn't suddenly stop working.
                  </p>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    🔒 <strong>Security:</strong> Your token is stored locally
                    in your browser only and never sent to our servers. PR
                    Manager only uses it to fetch repository data - it cannot
                    modify your code.
                  </p>
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    ⚠️ <strong>Important:</strong> Treat your GitHub token like
                    a password. Never share it publicly or commit it to code
                    repositories.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tips & Best Practices */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              💡 Tips & Best Practices
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Use for Pre-Review
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Run analysis before requesting human review to catch issues
                    early.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Follow the Checklist
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Use the generated review checklist to ensure comprehensive
                    code review.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">🧪</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Implement Test Plans
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Use the AI-generated test scenarios to improve your testing
                    coverage.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Iterate and Improve
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Re-analyze after making changes to see how the risk score
                    improves.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
