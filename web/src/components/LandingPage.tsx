import React, { useState } from "react";
import { AuthModal } from "./AuthModal";
import { GuestModeModal } from "./GuestModeModal";
import { LogoWithText } from "./Logo";
import { DocumentationPage } from "./DocumentationPage";
import { FAQPage } from "./FAQPage";
import { AboutPage } from "./AboutPage";
import { ContactPage } from "./ContactPage";

import { LoginData } from "../lib/auth-api";

interface LandingPageProps {
  onLogin: (data: LoginData) => Promise<void>;
  onSignup: (data: any) => Promise<void>;
  onContinueAsGuest: () => void;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onSignup,
  onContinueAsGuest,
  isLoading,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    "home" | "docs" | "faq" | "about" | "contact"
  >("home");

  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Analysis",
      description:
        "Advanced AI analyzes your pull requests for code quality, security risks, and potential issues.",
    },
    {
      icon: "⚡",
      title: "Lightning Fast",
      description:
        "Get comprehensive PR analysis in seconds, not minutes. Streamline your code review process.",
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description:
        "Your code stays private. We use enterprise-grade security to protect your repositories.",
    },
    {
      icon: "📊",
      title: "Detailed Insights",
      description:
        "Get risk scores, reviewer checklists, test suggestions, and actionable feedback.",
    },
    {
      icon: "🔗",
      title: "GitHub Integration",
      description:
        "Seamlessly integrates with GitHub. Analyze any public or private repository.",
    },
    {
      icon: "👥",
      title: "Team Collaboration",
      description:
        "Share analysis results with your team and improve code quality together.",
    },
  ];

  const testimonials = [
    {
      name: "Demo User A",
      role: "Senior Developer",
      company: "Demo Corp",
      avatar: "👩‍💻",
      quote:
        "PR Manager has transformed our code review process. We catch issues early and ship with confidence.",
    },
    {
      name: "Demo User B",
      role: "Team Lead",
      company: "Demo Startup",
      avatar: "👨‍💼",
      quote:
        "The AI insights are incredibly accurate. It's like having a senior developer review every PR.",
    },
    {
      name: "Demo User C",
      role: "CTO",
      company: "Demo Studio",
      avatar: "👨‍💻",
      quote:
        "Our team velocity increased 40% after implementing PR Manager. Highly recommended!",
    },
  ];

  // Handle page navigation
  if (currentPage === "docs") {
    return <DocumentationPage onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "faq") {
    return <FAQPage onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "about") {
    return <AboutPage onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "contact") {
    return <ContactPage onBack={() => setCurrentPage("home")} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <LogoWithText size="md" theme="blue" />
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Supercharge Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Code Reviews
              </span>{" "}
              with AI
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Get instant, intelligent analysis of your pull requests. Catch
              bugs, security issues, and code quality problems before they reach
              production.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get Started
              </button>
              <button
                onClick={() => setShowGuestModal(true)}
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Continue as Guest
              </button>
            </div>
            <p className="text-center text-gray-600 mt-4 text-sm">
              <span className="font-medium">Guest mode:</span> Try all features
              with your own API keys - no account required
            </p>
          </div>

          {/* Hero Image/Demo */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-6 py-4 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="ml-4 text-gray-400 text-sm">
                  PR Manager - Analysis Results
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    AI Analysis Complete
                  </h3>
                  <p className="text-gray-600">
                    Your PR has been analyzed with actionable insights and
                    recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose PR Manager?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built by developers, for developers. Our AI-powered platform helps
              teams ship better code faster.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Developers
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of developers who trust PR Manager
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
              >
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Code Reviews?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers who are shipping better code with PR
            Manager.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started
          </button>
          <p className="text-blue-200 mt-4 text-sm">
            No credit card required • Free to use • Perfect for hackathons
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <LogoWithText size="sm" theme="blue" />
              <p className="text-gray-400 mt-4">
                AI-powered code review platform for modern development teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    AI Code Analysis
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Risk Assessment
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Review Checklist
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Test Plan Generation
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Tools</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    GitHub Integration
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    PR Browser
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Diff Analysis
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Security Scanning
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => setCurrentPage("docs")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Documentation
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("faq")}
                    className="hover:text-white transition-colors text-left"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("about")}
                    className="hover:text-white transition-colors text-left"
                  >
                    About
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setCurrentPage("contact")}
                    className="hover:text-white transition-colors text-left"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p className="mb-4">
              &copy; 2025 PR Manager - AI-Powered Pull Request Analysis
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <button
                onClick={() => {
                  window.history.pushState({}, "", "/merge-strategies");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Know Your Merge
              </button>
              <a
                href="#"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                About
              </a>
              <a
                href="#"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Privacy
              </a>
              <a
                href="https://github.com/mdsajid2/prmanager"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={onLogin}
        onSignup={onSignup}
        isLoading={isLoading}
      />

      {/* Guest Mode Modal */}
      <GuestModeModal
        isOpen={showGuestModal}
        onConfirm={() => {
          setShowGuestModal(false);
          onContinueAsGuest();
        }}
        onCancel={() => {
          setShowGuestModal(false);
          setShowAuthModal(true);
        }}
      />
    </div>
  );
};
