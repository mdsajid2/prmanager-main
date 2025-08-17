import React, { useState } from "react";

export const MergeStrategiesPage: React.FC = () => {
  const [activeStrategy, setActiveStrategy] = useState<
    "squash" | "merge" | "rebase"
  >("squash");

  const strategies = {
    squash: {
      title: "🗜️ Squash and Merge",
      subtitle: "Recommended for most teams",
      description:
        "Combines all commits from your feature branch into a single, clean commit",
      pros: [
        "Clean, readable history",
        "Easy to rollback entire features",
        "No 'work in progress' commits",
        "Simplified debugging",
        "Professional appearance",
      ],
      cons: [
        "Individual commit context is lost",
        "Multiple authors may be combined",
        "Can't isolate specific changes within feature",
      ],
      bestFor: [
        "Feature development with multiple small commits",
        "Teams prioritizing clean history",
        "Most common choice for professional development",
      ],
      visual: `
Before:
main:     A---B---C
               \\
feature:        D---E---F---G

After Squash:
main:     A---B---C---H
                      └─ "Feature: User Auth (#123)"
      `,
    },
    merge: {
      title: "🔀 Create a Merge Commit",
      subtitle: "Best for complex features",
      description:
        "Preserves all individual commits and creates a merge commit connecting branches",
      pros: [
        "Complete history preserved",
        "Individual contributor attribution",
        "Context of when features were integrated",
        "Can examine each development step",
        "Clear branching visibility",
      ],
      cons: [
        "Can become cluttered and hard to read",
        "Includes 'work in progress' commits",
        "Complex rollback process",
        "Additional merge commits",
      ],
      bestFor: [
        "Complex features with significant commits",
        "Open source projects",
        "Teams needing detailed audit trails",
      ],
      visual: `
Before:
main:     A---B---C
               \\
feature:        D---E---F---G

After Merge:
main:     A---B---C-------M
               \\         /
                D---E---F---G
      `,
    },
    rebase: {
      title: "🔄 Rebase and Merge",
      subtitle: "For advanced Git users",
      description:
        "Creates a perfectly linear history by replaying commits on top of main branch",
      pros: [
        "Linear, professional history",
        "Preserved individual commits",
        "No merge commits cluttering history",
        "Easy to use git bisect",
        "Clear chronological timeline",
      ],
      cons: [
        "Requires Git rebasing knowledge",
        "Can be challenging with conflicts",
        "Original development timeline altered",
        "Commit hashes change during rebase",
      ],
      bestFor: [
        "Teams experienced with Git",
        "Projects requiring linear history",
        "When commits are well-crafted and meaningful",
      ],
      visual: `
Before:
main:     A---B---C
               \\
feature:        D---E---F---G

After Rebase:
main:     A---B---C---D'---E'---F'---G'
      `,
    },
  };

  const currentStrategy = strategies[activeStrategy];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔀 Know Your Merge Strategies
              </h1>
              <p className="text-gray-600 mt-2">
                Master GitHub merge strategies to maintain professional project
                history
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="btn-secondary"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Strategy Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Choose a Strategy to Learn
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(strategies).map(([key, strategy]) => (
              <button
                key={key}
                onClick={() =>
                  setActiveStrategy(key as "squash" | "merge" | "rebase")
                }
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  activeStrategy === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">
                  {strategy.title}
                </div>
                <div className="text-sm text-gray-600">{strategy.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Strategy Details */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Details */}
          <div className="space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-semibold mb-3 flex items-center">
                {currentStrategy.title}
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {activeStrategy === "squash"
                    ? "Recommended"
                    : activeStrategy === "merge"
                    ? "Complex"
                    : "Advanced"}
                </span>
              </h3>
              <p className="text-gray-700 mb-4">
                {currentStrategy.description}
              </p>
            </div>

            {/* Pros */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                ✅ Advantages
              </h4>
              <ul className="space-y-2">
                {currentStrategy.pros.map((pro, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                ⚠️ Disadvantages
              </h4>
              <ul className="space-y-2">
                {currentStrategy.cons.map((con, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-amber-600 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{con}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Best For */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                🎯 Best For
              </h4>
              <ul className="space-y-2">
                {currentStrategy.bestFor.map((use, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{use}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="space-y-6">
            {/* Visual Diagram */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                📊 Visual Representation
              </h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre">{currentStrategy.visual}</pre>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-4">
                🚀 Quick Decision Guide
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span>Clean history priority</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      activeStrategy === "squash"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {activeStrategy === "squash"
                      ? "Perfect"
                      : activeStrategy === "rebase"
                      ? "Good"
                      : "Poor"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span>Individual commit history</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      activeStrategy === "merge"
                        ? "bg-green-100 text-green-800"
                        : activeStrategy === "rebase"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {activeStrategy === "merge"
                      ? "Perfect"
                      : activeStrategy === "rebase"
                      ? "Good"
                      : "Lost"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span>Rollback complexity</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      activeStrategy === "squash"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {activeStrategy === "squash" ? "Simple" : "Complex"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span>Git knowledge required</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      activeStrategy === "squash"
                        ? "bg-green-100 text-green-800"
                        : activeStrategy === "merge"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {activeStrategy === "squash"
                      ? "Basic"
                      : activeStrategy === "merge"
                      ? "Medium"
                      : "Advanced"}
                  </span>
                </div>
              </div>
            </div>

            {/* Industry Usage */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                🏢 Industry Usage
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Enterprise Teams</span>
                    <span className="font-medium">
                      {activeStrategy === "squash"
                        ? "70%"
                        : activeStrategy === "merge"
                        ? "25%"
                        : "5%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        activeStrategy === "squash"
                          ? "bg-green-500"
                          : activeStrategy === "merge"
                          ? "bg-blue-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width:
                          activeStrategy === "squash"
                            ? "70%"
                            : activeStrategy === "merge"
                            ? "25%"
                            : "5%",
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Open Source</span>
                    <span className="font-medium">
                      {activeStrategy === "squash"
                        ? "40%"
                        : activeStrategy === "merge"
                        ? "50%"
                        : "10%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        activeStrategy === "squash"
                          ? "bg-green-500"
                          : activeStrategy === "merge"
                          ? "bg-blue-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width:
                          activeStrategy === "squash"
                            ? "40%"
                            : activeStrategy === "merge"
                            ? "50%"
                            : "10%",
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Startups</span>
                    <span className="font-medium">
                      {activeStrategy === "squash"
                        ? "80%"
                        : activeStrategy === "merge"
                        ? "15%"
                        : "5%"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        activeStrategy === "squash"
                          ? "bg-green-500"
                          : activeStrategy === "merge"
                          ? "bg-blue-500"
                          : "bg-purple-500"
                      }`}
                      style={{
                        width:
                          activeStrategy === "squash"
                            ? "80%"
                            : activeStrategy === "merge"
                            ? "15%"
                            : "5%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mt-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Use This Knowledge?
          </h3>
          <p className="text-gray-600 mb-4">
            Apply what you've learned in PR Manager's one-click merge feature
          </p>
          <button onClick={() => window.history.back()} className="btn-primary">
            🔀 Back to PR Analysis
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              © 2025 PR Manager - AI-Powered Pull Request Analysis
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="#" className="hover:text-blue-600">
                About
              </a>
              <a href="#" className="hover:text-blue-600">
                Privacy
              </a>
              <a href="#" className="hover:text-blue-600">
                Terms
              </a>
              <a
                href="https://github.com/mdsajid2/prmanager"
                className="hover:text-blue-600"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
