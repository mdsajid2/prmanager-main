import React, { useState } from "react";
import { LogoWithText } from "./Logo";

interface ContactPageProps {
  onBack: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, just show an alert
    alert("Thank you for your message! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
            📞 Contact Us
          </h1>
          <p className="text-gray-600 mb-8">
            Have questions, feedback, or need support? We'd love to hear from
            you!
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                    <option value="feedback">Feedback</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Get in Touch
              </h2>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <span className="mr-2">💼</span>
                    Developer
                  </h3>
                  <p className="text-blue-800 mb-2">Mohammed Sajid</p>
                  <a
                    href="https://www.linkedin.com/in/mdsajid2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Connect on LinkedIn →
                  </a>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                    <span className="mr-2">⚡</span>
                    Quick Response
                  </h3>
                  <p className="text-green-800 text-sm">
                    We typically respond to inquiries within 24 hours during
                    business days.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                    <span className="mr-2">🐛</span>
                    Bug Reports
                  </h3>
                  <p className="text-purple-800 text-sm">
                    Found a bug? Please include steps to reproduce, expected
                    behavior, and any error messages you encountered.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
                    <span className="mr-2">💡</span>
                    Feature Requests
                  </h3>
                  <p className="text-orange-800 text-sm">
                    Have an idea for a new feature? We'd love to hear about it!
                    Describe your use case and how it would help your workflow.
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Frequently Asked Questions
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Before reaching out, check our FAQ page for quick answers to
                  common questions.
                </p>
                <button
                  onClick={onBack}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  View FAQ →
                </button>
              </div>
            </div>
          </div>

          {/* Additional Resources */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Additional Resources
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={onBack}
                className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">📚</div>
                <h3 className="font-semibold text-blue-900">Documentation</h3>
                <p className="text-blue-700 text-sm">
                  Complete guide on how to use PR Manager
                </p>
              </button>

              <button
                onClick={onBack}
                className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">❓</div>
                <h3 className="font-semibold text-green-900">FAQ</h3>
                <p className="text-green-700 text-sm">
                  Answers to frequently asked questions
                </p>
              </button>

              <button
                onClick={onBack}
                className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
              >
                <div className="text-2xl mb-2">ℹ️</div>
                <h3 className="font-semibold text-purple-900">About</h3>
                <p className="text-purple-700 text-sm">
                  Learn more about PR Manager and our mission
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
