// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

// Get API base URL with localhost detection
const getApiBase = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Check if we're running on localhost (development)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("localhost");

  // If running on localhost, always use localhost API
  if (isLocalhost) {
    return "http://localhost:3001";
  }

  // Production: use current origin
  return window.location.origin;
};

const API_BASE = getApiBase();

export interface UsageStats {
  currentMonthCalls: number;
  currentMonthAnalyzeCalls: number;
  subscriptionPlan: string;
  monthlyLimit: number;
  analyzeLimit: number;
  baseLimit: number;
  bonusCredits: number;
  referralMultiplier: number;
  effectiveLimit: number;
  callsRemaining: number;
  analyzeRemaining: number;
  usagePercentage: number;
  daysUntilReset: number;
  totalReferrals: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  canUpgrade: boolean;
  resetDate: string;
  currentMonth: string;
  lastUpdated: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyLimit: number;
  analyzeLimit: number;
  price: number;
  features: string[];
  isPopular: boolean;
  isEnterprise: boolean;
}

export interface UsageHistory {
  month: string;
  totalCalls: number;
  analyzeCalls: number;
  limit: number;
  usagePercentage: number;
}

class UsageAPI {
  private async getHeaders() {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get current user's usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const response = await fetch(`${API_BASE}/api/usage/stats`, {
      method: "GET",
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(`Failed to fetch usage stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans(): Promise<{ plans: SubscriptionPlan[] }> {
    const response = await fetch(`${API_BASE}/api/usage/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch subscription plans: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Upgrade user's subscription plan
   */
  async upgradeSubscription(planName: string): Promise<{
    message: string;
    newPlan: string;
    stats: UsageStats;
  }> {
    const response = await fetch(`${API_BASE}/api/usage/upgrade`, {
      method: "POST",
      headers: await this.getHeaders(),
      body: JSON.stringify({ planName }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to upgrade subscription: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get usage history (last 6 months)
   */
  async getUsageHistory(): Promise<{ history: UsageHistory[] }> {
    const response = await fetch(`${API_BASE}/api/usage/history`, {
      method: "GET",
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(`Failed to fetch usage history: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Reset monthly usage (development only)
   */
  async resetUsage(): Promise<{ message: string; stats: UsageStats }> {
    const response = await fetch(`${API_BASE}/api/usage/reset`, {
      method: "POST",
      headers: await this.getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      if (response.status === 403) {
        throw new Error("Not authorized to reset usage");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to reset usage: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Format usage percentage for display
   */
  formatUsagePercentage(percentage: number): string {
    return `${Math.round(percentage)}%`;
  }

  /**
   * Get usage status color based on percentage
   */
  getUsageStatusColor(percentage: number): string {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 80) return "text-orange-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-green-600";
  }

  /**
   * Get usage status message
   */
  getUsageStatusMessage(stats: UsageStats): string {
    if (stats.isOverLimit) {
      return `You've exceeded your monthly limit of ${stats.analyzeLimit} analyses. Upgrade to continue.`;
    }
    if (stats.isNearLimit) {
      return `You're approaching your monthly limit. ${stats.analyzeRemaining} analyses remaining.`;
    }
    return `${stats.analyzeRemaining} of ${stats.analyzeLimit} analyses remaining this month.`;
  }

  /**
   * Format plan price for display
   */
  formatPrice(price: number): string {
    if (price === 0) return "Free";
    return `$${price.toFixed(2)}/month`;
  }

  /**
   * Get plan badge color
   */
  getPlanBadgeColor(planName: string): string {
    switch (planName.toLowerCase()) {
      case "free":
        return "bg-gray-100 text-gray-800";
      case "pro":
        return "bg-blue-100 text-blue-800";
      case "enterprise":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }
}

export const usageAPI = new UsageAPI();
