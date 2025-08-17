import React from "react";
import { LogoWithText } from "./Logo";

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
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
            🚀 About PR Manager
          </h1>

          {/* Mission */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              PR Manager is designed to revolutionize the code review process by
              leveraging artificial intelligence to provide instant,
              comprehensive analysis of pull requests. Our goal is to help
              development teams catch issues early, improve code quality, and
              ship with confidence.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium">
                "Empowering developers with intelligent code review insights to
                build better software, faster."
              </p>
            </div>
          </section>

          {/* What We Do */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              What We Do
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-semibold text-green-900 mb-2">
                  AI-Powered Analysis
                </h3>
                <p className="text-green-800 text-sm">
                  Advanced AI models analyze your code changes to identify
                  potential issues, security vulnerabilities, and areas for
                  improvement.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Risk Assessment
                </h3>
                <p className="text-blue-800 text-sm">
                  Intelligent risk scoring helps prioritize review efforts and
                  identify high-impact changes that need extra attention.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="font-semibold text-purple-900 mb-2">
                  Smart Checklists
                </h3>
                <p className="text-purple-800 text-sm">
                  Automatically generated review checklists ensure comprehensive
                  coverage of all important aspects of your changes.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg">
                <div className="text-3xl mb-3">🧪</div>
                <h3 className="font-semibold text-orange-900 mb-2">
                  Test Planning
                </h3>
                <p className="text-orange-800 text-sm">
                  AI-generated test scenarios and edge cases help ensure your
                  changes are thoroughly validated before deployment.
                </p>
              </div>
            </div>
          </section>

          {/* Technology */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Technology Stack
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• React with TypeScript</li>
                    <li>• Tailwind CSS</li>
                    <li>• Vite build system</li>
                    <li>• Responsive design</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Backend</h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Node.js with Express</li>
                    <li>• TypeScript</li>
                    <li>• GitHub API integration</li>
                    <li>• RESTful API design</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    AI & Cloud
                  </h3>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• Advanced AI models</li>
                    <li>• AWS deployment</li>
                    <li>• CloudFront CDN</li>
                    <li>• Secure architecture</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Developer */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Meet the Developer
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  MS
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Mohammed Sajid
                  </h3>
                  <p className="text-blue-600">
                    Full Stack Developer & AI Enthusiast
                  </p>
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                Passionate about leveraging AI to solve real-world development
                challenges. With expertise in modern web technologies and
                machine learning, Mohammed created PR Manager to help
                development teams improve their code review processes.
              </p>
              <a
                href="https://www.linkedin.com/in/mdsajid2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="mr-2">💼</span>
                Connect on LinkedIn
              </a>
            </div>
          </section>

          {/* Vision */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Our Vision
            </h2>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                We envision a future where AI-powered tools seamlessly integrate
                into developer workflows, making code review faster, more
                thorough, and more accessible to teams of all sizes.
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-gray-900">
                    Faster Reviews
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Reduce review time while improving quality
                  </p>
                </div>
                <div>
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold text-gray-900">
                    Better Quality
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Catch more issues before they reach production
                  </p>
                </div>
                <div>
                  <div className="text-2xl mb-2">🤝</div>
                  <h3 className="font-semibold text-gray-900">
                    Team Collaboration
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Enhance team communication and knowledge sharing
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
