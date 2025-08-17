import React, { useState } from "react";
import { LogoWithText } from "./Logo";

interface FAQPageProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onBack }) => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqs: FAQItem[] = [
    {
      question: "What is PR Manager?",
      answer:
        "PR Manager is an AI-powered code review platform that analyzes GitHub pull requests to provide risk assessments, review checklists, test plans, and intelligent insights to help developers improve code quality and catch issues early.",
    },
    {
      question: "How does the AI analysis work?",
      answer:
        "Our AI analyzes your code changes using advanced language models to understand the context, complexity, and potential impact of your changes. It considers factors like file types, change patterns, security implications, and code complexity to generate comprehensive insights.",
    },
    {
      question: "Is my code secure? Do you store my code?",
      answer:
        "Your code security is our priority. We do not store your code on our servers. The analysis is performed in real-time, and only the analysis results are temporarily cached. Your GitHub tokens are stored locally in your browser and never sent to our servers.",
    },
    {
      question: "Do I need a GitHub token?",
      answer:
        "A GitHub token is optional. You can analyze public repositories without a token by pasting the PR URL directly. However, a token is required to browse your private repositories and access the repository browser feature.",
    },
    {
      question: "How do I create a secure, read-only GitHub token?",
      answer:
        "For maximum security, follow these steps: 1) Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), 2) Click 'Generate new token (classic)', 3) Set expiration to 90 days, 4) For public repos only: select 'public_repo' scope, 5) For private repos: select 'repo' scope (includes read/write but PR Manager only uses read), 6) DO NOT select workflow, admin, or delete permissions, 7) Copy the token immediately and paste it in PR Manager settings. The token is stored locally in your browser only.",
    },
    {
      question: "What permissions does the GitHub token need?",
      answer:
        "For public repositories, you only need 'public_repo' scope. For private repositories, you need 'repo' scope. We recommend using the minimal permissions necessary for your use case.",
    },
    {
      question: "Can I analyze private repositories?",
      answer:
        "Yes, you can analyze private repositories by providing a GitHub token with appropriate permissions. The token is stored locally in your browser and used only to fetch repository data.",
    },
    {
      question: "What types of insights does PR Manager provide?",
      answer:
        "PR Manager provides: Risk scores (1-100), Review checklists with blocking and non-blocking items, AI-generated test plans, Security vulnerability detection, Code complexity analysis, Questions for the PR author, and Actionable recommendations.",
    },
    {
      question: "How accurate is the risk assessment?",
      answer:
        "The risk assessment is based on multiple factors including code complexity, file types, change patterns, and security implications. While highly accurate for most scenarios, it should be used as a guide alongside human judgment and not as the sole decision-making factor.",
    },
    {
      question: "Can I use this for any programming language?",
      answer:
        "Yes, PR Manager supports analysis of pull requests in any programming language. The AI is trained on multiple languages and can provide insights for JavaScript, Python, Java, C#, Go, Rust, and many others.",
    },
    {
      question: "How do I analyze a pull request?",
      answer:
        "There are three ways: 1) Paste a GitHub PR URL directly, 2) Use the repository browser (requires GitHub token) to select a PR, or 3) Paste a git diff directly into the diff analyzer.",
    },
    {
      question: "What if I don't have a GitHub account?",
      answer:
        "You can still use PR Manager by pasting git diff output directly into the diff analyzer. This works offline and doesn't require any GitHub integration.",
    },
    {
      question: "Is my GitHub token safe? What if it gets compromised?",
      answer:
        "Your GitHub token is stored locally in your browser only and never sent to our servers. However, if you suspect it's compromised: 1) Go to GitHub → Settings → Developer settings → Personal access tokens, 2) Find your PR Manager token and click 'Delete', 3) Create a new token with minimal permissions, 4) Update PR Manager settings with the new token. Always use tokens with minimal required permissions and set expiration dates.",
    },
    {
      question: "Is there a limit on PR size?",
      answer:
        "PR Manager can handle most pull requests, but very large PRs (1000+ files or 100MB+ diffs) may take longer to process or hit processing limits. We recommend breaking large changes into smaller, focused PRs for better analysis and review.",
    },
    {
      question: "Can I integrate this with my CI/CD pipeline?",
      answer:
        "Currently, PR Manager is a web-based tool. API integration for CI/CD pipelines is planned for future releases. You can manually analyze PRs as part of your review process.",
    },
    {
      question: "How do I report issues or request features?",
      answer:
        "You can contact us through the Contact page or reach out to the developer directly via LinkedIn. We welcome feedback and feature requests to improve the platform.",
    },
    {
      question: "Is PR Manager free to use?",
      answer:
        "Yes, PR Manager is currently free to use. This is a demo application showcasing AI-powered code review capabilities.",
    },
  ];

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ❓ Frequently Asked Questions
          </h1>
          <p className="text-gray-600 mb-8">
            Find answers to common questions about PR Manager and how to use it
            effectively.
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <span className="text-2xl text-blue-600">
                    {openItems.includes(index) ? "−" : "+"}
                  </span>
                </button>
                {openItems.includes(index) && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Still have questions?
            </h2>
            <p className="text-blue-800 mb-4">
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex space-x-4">
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Us
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
