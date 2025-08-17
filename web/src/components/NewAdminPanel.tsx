import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { SystemHealthDashboard } from "./SystemHealthDashboard";

interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_plan: string;
  is_verified: boolean;
  api_usage_count: number;
  api_usage_limit: number;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalApiCalls: number;
  todayApiCalls: number;
}

const NewAdminPanel: React.FC = () => {
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "users" | "analytics" | "system"
  >("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedUserForCredits, setSelectedUserForCredits] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [creditsSearchTerm, setCreditsSearchTerm] = useState("");
  const [bonusCredits, setBonusCredits] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCreditsDropdown, setShowCreditsDropdown] = useState(false);

  // Get API base URL
  const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    return isLocalhost ? "http://localhost:3001" : "";
  };

  const API_BASE = getApiBase();

  // Fetch admin data
  const fetchAdminData = async () => {
    console.log("🔍 fetchAdminData called");
    console.log("Token available:", !!token);
    console.log("User available:", !!user);
    console.log("API_BASE:", API_BASE);

    if (!token) {
      console.error("❌ No authentication token available");
      console.log(
        "localStorage auth_token:",
        localStorage.getItem("auth_token")
      );
      setError("No authentication token available. Please login again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(
        "🔍 Fetching admin data with token:",
        token.substring(0, 20) + "..."
      );
      console.log("Full token length:", token.length);

      // Fetch users
      const usersResponse = await fetch(`${API_BASE}/api/new-admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Users response status:", usersResponse.status);

      if (!usersResponse.ok) {
        const errorData = await usersResponse.text();
        console.error("❌ Users fetch failed:", errorData);
        throw new Error(
          `Failed to fetch users: ${usersResponse.status} - ${errorData}`
        );
      }

      const usersData = await usersResponse.json();
      console.log("✅ Users data received:", usersData);
      setUsers(usersData);
      setFilteredUsers(usersData);

      // Fetch stats
      const statsResponse = await fetch(`${API_BASE}/api/new-admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        console.warn("Stats endpoint not available");
        // Generate basic stats from users data
        setStats({
          totalUsers: usersData.length,
          activeUsers: usersData.filter((u: AdminUser) => u.is_verified).length,
          totalApiCalls: usersData.reduce(
            (sum: number, u: AdminUser) => sum + u.api_usage_count,
            0
          ),
          todayApiCalls: 0,
        });
      }
    } catch (err) {
      console.error("❌ Admin data fetch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load admin data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔄 useEffect triggered - token changed:", !!token);
    if (token) {
      fetchAdminData();
    } else {
      // Try to get token from localStorage if not in context
      const savedToken = localStorage.getItem("auth_token");
      if (savedToken) {
        console.log("🔄 Found token in localStorage, but not in context");
        // This suggests the AuthContext might not be properly initialized
        setError(
          "Authentication context not properly initialized. Please refresh the page."
        );
      }
    }
  }, [token]);

  // Search filter effect
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-dropdown")) {
        setShowUserDropdown(false);
        setShowCreditsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Admin functions
  const resetUserUsage = async (userId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE}/api/new-admin/users/${userId}/reset-usage`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset usage");
      }

      alert("✅ User usage reset successfully!");
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error("Failed to reset usage:", error);
      alert(
        "❌ Failed to reset usage: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const addBonusCredits = async () => {
    if (!selectedUserForCredits || bonusCredits <= 0) {
      alert("Please select a user and enter valid bonus credits");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `${API_BASE}/api/new-admin/users/${selectedUserForCredits}/add-credits`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credits: bonusCredits }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add bonus credits");
      }

      alert(`✅ Added ${bonusCredits} bonus credits successfully!`);
      setBonusCredits(0);
      setSelectedUserForCredits("");
      setCreditsSearchTerm("");
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error("Failed to add bonus credits:", error);
      alert(
        "❌ Failed to add bonus credits: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users for dropdowns
  const getFilteredUsersForReset = () => {
    if (!userSearchTerm) return users.slice(0, 10); // Show first 10 if no search
    return users
      .filter(
        (user) =>
          user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          user.first_name
            ?.toLowerCase()
            .includes(userSearchTerm.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
      )
      .slice(0, 10); // Limit to 10 results
  };

  const getFilteredUsersForCredits = () => {
    if (!creditsSearchTerm) return users.slice(0, 10); // Show first 10 if no search
    return users
      .filter(
        (user) =>
          user.email.toLowerCase().includes(creditsSearchTerm.toLowerCase()) ||
          user.first_name
            ?.toLowerCase()
            .includes(creditsSearchTerm.toLowerCase()) ||
          user.last_name
            ?.toLowerCase()
            .includes(creditsSearchTerm.toLowerCase())
      )
      .slice(0, 10); // Limit to 10 results
  };

  const getSelectedUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return "";
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name} (${user.email})`
      : user.email;
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      window.location.href = "/";
    }
  };

  // Check if user is admin
  const isAdmin =
    user?.subscription_plan === "enterprise" ||
    user?.email === "mdsajid8636@gmail.com";

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">
            Loading authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAdminData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.first_name || user?.email}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(
                    user?.first_name?.[0] ||
                    user?.email?.[0] ||
                    "A"
                  ).toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "users", label: "Users", icon: "👥" },
              { id: "analytics", label: "Analytics", icon: "📈" },
              { id: "system", label: "System Health", icon: "🔍" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Users
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.totalUsers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Active Users
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.activeUsers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total API Calls
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.totalApiCalls}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Today's Calls
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.todayApiCalls}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Recent Users
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(
                              user.first_name?.[0] || user.email[0]
                            ).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.is_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.is_verified ? "Verified" : "Pending"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {user.api_usage_count} calls
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            {/* Admin Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Admin Controls
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reset Usage */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">
                    Reset User Usage
                  </h4>
                  <div className="relative user-dropdown">
                    <input
                      type="text"
                      placeholder="Search users by email or name..."
                      value={
                        selectedUser
                          ? getSelectedUserName(selectedUser)
                          : userSearchTerm
                      }
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setSelectedUser("");
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showUserDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredUsersForReset().length > 0 ? (
                          getFilteredUsersForReset().map((user) => (
                            <div
                              key={user.id}
                              onClick={() => {
                                setSelectedUser(user.id);
                                setUserSearchTerm("");
                                setShowUserDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-gray-500">
                                {user.first_name &&
                                  user.last_name &&
                                  `${user.first_name} ${user.last_name} • `}
                                Usage: {user.api_usage_count}/
                                {user.api_usage_limit}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            No users found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => selectedUser && resetUserUsage(selectedUser)}
                    disabled={!selectedUser || actionLoading}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Resetting..." : "Reset Usage"}
                  </button>
                </div>

                {/* Add Bonus Credits */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">
                    Add Bonus Credits
                  </h4>
                  <div className="relative user-dropdown">
                    <input
                      type="text"
                      placeholder="Search users by email or name..."
                      value={
                        selectedUserForCredits
                          ? getSelectedUserName(selectedUserForCredits)
                          : creditsSearchTerm
                      }
                      onChange={(e) => {
                        setCreditsSearchTerm(e.target.value);
                        setSelectedUserForCredits("");
                        setShowCreditsDropdown(true);
                      }}
                      onFocus={() => setShowCreditsDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showCreditsDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredUsersForCredits().length > 0 ? (
                          getFilteredUsersForCredits().map((user) => (
                            <div
                              key={user.id}
                              onClick={() => {
                                setSelectedUserForCredits(user.id);
                                setCreditsSearchTerm("");
                                setShowCreditsDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-gray-500">
                                {user.first_name &&
                                  user.last_name &&
                                  `${user.first_name} ${user.last_name} • `}
                                Current Limit: {user.api_usage_limit}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500">
                            No users found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    value={bonusCredits}
                    onChange={(e) => setBonusCredits(Number(e.target.value))}
                    placeholder="Enter bonus credits"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addBonusCredits}
                    disabled={
                      !selectedUserForCredits ||
                      bonusCredits <= 0 ||
                      actionLoading
                    }
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Adding..." : "Add Credits"}
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    All Users ({filteredUsers.length})
                  </h3>
                  <div className="w-64">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      API Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {(
                                user.first_name?.[0] || user.email[0]
                              ).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.subscription_plan === "enterprise"
                              ? "bg-purple-100 text-purple-800"
                              : user.subscription_plan === "pro"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.subscription_plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.is_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.is_verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.api_usage_count} / {user.api_usage_limit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => resetUserUsage(user.id)}
                            disabled={actionLoading}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                            title="Reset Usage"
                          >
                            🔄
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForCredits(user.id);
                              setBonusCredits(100);
                              setCreditsSearchTerm("");
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Add Credits"
                          >
                            💰
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Analytics
            </h3>
            <p className="text-gray-600">Analytics features coming soon...</p>
          </div>
        )}

        {activeTab === "system" && <SystemHealthDashboard />}
      </div>
    </div>
  );
};

export default NewAdminPanel;
