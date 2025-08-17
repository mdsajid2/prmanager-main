import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface EnhancedUsageStats {
  current: number;
  baseLimit: number;
  bonusCalls: number;
  totalLimit: number;
  remaining: number;
  allowed: boolean;
  referralStats: {
    referralCode: string;
    totalReferrals: number;
    successfulReferrals: number;
    bonusCallsEarned: number;
  };
}

interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  bonusCallsEarned: number;
}

export const SimpleUsageStats: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [stats, setStats] = useState<EnhancedUsageStats | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [showLimitRequest, setShowLimitRequest] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    if (!user || isGuest) return;

    setLoading(true);
    setError(null);

    try {
      const [statsResponse, referralResponse] = await Promise.all([
        fetch("/api/enhanced-usage", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
        fetch("/api/referral-info", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
      ]);

      if (!statsResponse.ok || !referralResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const statsData = await statsResponse.json();
      const referralData = await referralResponse.json();

      setStats(statsData);
      setReferralInfo(referralData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralInfo?.referralLink) return;

    try {
      await navigator.clipboard.writeText(referralInfo.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user, isGuest]);

  if (isGuest || !user) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-600 text-sm">⚠️ {error}</p>
        <button
          onClick={fetchStats}
          className="text-yellow-600 hover:text-yellow-800 text-xs underline mt-1"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const percentage = (stats.current / stats.totalLimit) * 100;
  const getColor = () => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = () => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">📊 Daily Usage</h3>
        <button
          onClick={fetchStats}
          className="text-gray-400 hover:text-gray-600 text-sm"
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* Usage Progress */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">AI Calls Today</span>
          <span className={`text-sm font-medium ${getColor()}`}>
            {stats.current} / {stats.totalLimit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>

        {/* Breakdown */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Base: {stats.baseLimit}</span>
          {stats.bonusCalls > 0 && (
            <span className="text-green-600">Bonus: +{stats.bonusCalls}</span>
          )}
          <span>{stats.remaining} remaining</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowReferral(!showReferral)}
          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-2 px-3 rounded border border-blue-200 transition-colors"
        >
          🎁 Earn More (+2 per referral)
        </button>
        <button
          onClick={() => setShowLimitRequest(!showLimitRequest)}
          className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded border border-gray-200 transition-colors"
        >
          📧 Request More
        </button>
      </div>

      {/* Referral Section */}
      {showReferral && referralInfo && (
        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">🎁 Referral Program</h4>
            <span className="text-xs text-green-600 font-medium">
              +{referralInfo.bonusCallsEarned} bonus calls earned
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600 mb-2">
              Share your link and earn +2 daily calls per signup:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralInfo.referralLink}
                readOnly
                className="flex-1 text-xs p-2 border rounded bg-white"
              />
              <button
                onClick={copyReferralLink}
                className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-blue-600">
                {referralInfo.totalReferrals}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-green-600">
                {referralInfo.successfulReferrals}
              </div>
              <div className="text-xs text-gray-500">Successful</div>
            </div>
            <div className="bg-white p-2 rounded border">
              <div className="text-lg font-bold text-purple-600">
                {referralInfo.bonusCallsEarned}
              </div>
              <div className="text-xs text-gray-500">Bonus Calls</div>
            </div>
          </div>
        </div>
      )}

      {/* Limit Request Section */}
      {showLimitRequest && (
        <div className="border-t pt-3">
          <h4 className="font-medium text-gray-900 mb-2">
            📧 Request Higher Limits
          </h4>
          <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
            <p className="mb-2">
              Need more than {stats.totalLimit} daily calls?
            </p>
            <p className="mb-3">
              Contact us with your use case and we'll review your request within
              24 hours.
            </p>
            <a
              href="mailto:support@prmanagerai.com?subject=Limit Increase Request&body=Current limit: {stats.totalLimit}%0D%0ARequested limit: %0D%0AReason: %0D%0AUse case: %0D%0ACompany: "
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              📧 Contact Support
            </a>
          </div>
        </div>
      )}

      {/* Reset Info */}
      <div className="text-xs text-gray-500 border-t pt-2">
        <p>Resets at midnight EST • Free tier: {stats.baseLimit} calls/day</p>
      </div>
    </div>
  );
};

export default SimpleUsageStats;
