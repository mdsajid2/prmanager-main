import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { SystemHealthDashboard } from "./SystemHealthDashboard";

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  subscription_plan: string;
  total_referrals: number;
  bonus_credits: number;
  referral_multiplier: number;
  referral_code: string;
  current_usage: number;
  effective_limit: number;
  created_at: string;
  last_login: string;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "system">("users");

  // Debug logging
  console.log("AdminPanel activeTab:", activeTab);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [bonusCredits, setBonusCredits] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email === "mdsajid8636@gmail.com";

  useEffect(() => {
    if (isAdmin) {
      // Check if token is available before loading users
      const checkTokenAndLoad = () => {
        const token = localStorage.getItem("auth_token");
        if (token) {
          loadUsers();
        } else {
          // Retry after a short delay if token not yet available
          setTimeout(checkTokenAndLoad, 100);
        }
      };
      checkTokenAndLoad();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        console.error("❌ No auth token available for admin request");
        throw new Error("Authentication token not found");
      }

      console.log("🔍 Loading admin users...", {
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + "..." : "none",
      });

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Admin users response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Admin users error response:", errorText);
        throw new Error(
          `Failed to load users: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ Admin users loaded:", data.users?.length || 0, "users");
      setUsers(data.users);
      setError(null);
    } catch (err) {
      console.error("❌ Failed to load users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const resetUserUsage = async (userId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/reset-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset usage");
      }

      alert("✅ User usage reset successfully!");
      loadUsers(); // Refresh the list
    } catch (err) {
      console.error("Failed to reset usage:", err);
      alert(
        "❌ Failed to reset usage: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const addBonusCredits = async () => {
    if (!selectedUser || bonusCredits <= 0) {
      alert("Please select a user and enter valid bonus credits");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/add-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          userId: selectedUser,
          credits: bonusCredits,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add bonus credits");
      }

      alert(`✅ Added ${bonusCredits} bonus credits successfully!`);
      setBonusCredits(0);
      setSelectedUser("");
      loadUsers(); // Refresh the list
    } catch (err) {
      console.error("Failed to add bonus credits:", err);
      alert(
        "❌ Failed to add bonus credits: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🛠️ Admin Panel
              </h1>
              <p className="text-gray-600 mt-1">
                Manage users and API usage limits
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  window.history.pushState({}, "", "/");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="text-right">
                <div className="text-sm text-gray-500">Logged in as</div>
                <div className="font-semibold text-gray-900">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Admin Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🎛️ Admin Actions
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Add Bonus Credits */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                💰 Add Bonus Credits
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.first_name} {user.last_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus Credits
                  </label>
                  <input
                    type="number"
                    value={bonusCredits}
                    onChange={(e) =>
                      setBonusCredits(parseInt(e.target.value) || 0)
                    }
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter credits to add"
                  />
                </div>
                <button
                  onClick={addBonusCredits}
                  disabled={actionLoading || !selectedUser || bonusCredits <= 0}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {actionLoading ? "Adding..." : "Add Bonus Credits"}
                </button>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                📊 Platform Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Users:</span>
                  <span className="font-semibold">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Referrers:</span>
                  <span className="font-semibold">
                    {users.filter((u) => u.total_referrals > 0).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Referrals:</span>
                  <span className="font-semibold">
                    {users.reduce((sum, u) => sum + u.total_referrals, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bonus Credits:</span>
                  <span className="font-semibold">
                    {users.reduce((sum, u) => sum + u.bonus_credits, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                👥 User Management
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "system"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                🔍 System Health
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referrals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bonuses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Joined:{" "}
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {user.current_usage}/{user.effective_limit}
                          </div>
                          <div className="text-gray-500">
                            {(
                              (user.current_usage / user.effective_limit) *
                              100
                            ).toFixed(0)}
                            % used
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {user.total_referrals} referrals
                          </div>
                          <div className="text-gray-500">
                            {((user.referral_multiplier - 1) * 100).toFixed(0)}%
                            boost
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Code: {user.referral_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-green-600">
                            +{user.bonus_credits} credits
                          </div>
                          <div className="text-gray-500">
                            Effective: {user.effective_limit}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => resetUserUsage(user.id)}
                          disabled={actionLoading}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          Reset Usage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "system" && <SystemHealthDashboard />}
        </div>
      </div>
    </div>
  );
};
