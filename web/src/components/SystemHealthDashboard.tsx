import React, { useState, useEffect } from "react";

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercentage: number;
  };
  network: {
    hostname: string;
    platform: string;
    nodeVersion: string;
  };
}

interface DatabaseHealth {
  status: "healthy" | "degraded" | "unhealthy";
  connectionTime: number;
  activeConnections: number;
  maxConnections: number;
  databaseSize: string;
  tableStats: {
    tableName: string;
    rowCount: number;
    size: string;
  }[];
  recentErrors: string[];
}

interface ServiceHealth {
  status: "online" | "offline" | "error";
  pid: number | null;
  uptime: number;
  restarts: number;
  memory: number;
  cpu: number;
  lastRestart: string | null;
}

interface ApplicationHealth {
  version: string;
  environment: string;
  features: {
    name: string;
    enabled: boolean;
    status: string;
  }[];
  endpoints: {
    path: string;
    status: number;
    responseTime: number;
  }[];
}

interface HealthReport {
  timestamp: string;
  system: SystemMetrics;
  database: DatabaseHealth;
  service: ServiceHealth;
  application: ApplicationHealth;
  overallStatus: "healthy" | "degraded" | "unhealthy";
}

export const SystemHealthDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Debug logging
  console.log("SystemHealthDashboard mounted");

  const fetchHealthData = async () => {
    try {
      const response = await fetch("/api/admin/system-health", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch health data (${response.status})`);
      }

      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load health data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "healthy":
      case "online":
        return "text-green-600 bg-green-50 border-green-200";
      case "degraded":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "unhealthy":
      case "offline":
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">
            Error Loading System Health
          </h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={fetchHealthData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            System Health Dashboard
          </h2>
          <p className="text-gray-600 text-sm">
            Last updated: {new Date(healthData.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealthData}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div
        className={`p-4 rounded-lg border ${getStatusColor(
          healthData.overallStatus
        )}`}
      >
        <div className="flex items-center space-x-2">
          <div className="text-2xl">
            {healthData.overallStatus === "healthy"
              ? "✅"
              : healthData.overallStatus === "degraded"
              ? "⚠️"
              : "❌"}
          </div>
          <div>
            <h3 className="font-semibold capitalize">
              System Status: {healthData.overallStatus}
            </h3>
            <p className="text-sm opacity-75">
              {healthData.overallStatus === "healthy" &&
                "All systems operational"}
              {healthData.overallStatus === "degraded" &&
                "Some systems experiencing issues"}
              {healthData.overallStatus === "unhealthy" &&
                "Critical systems need attention"}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">CPU Usage</h3>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage</span>
              <span>{healthData.system.cpu.usage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(
                  healthData.system.cpu.usage
                )}`}
                style={{
                  width: `${Math.min(healthData.system.cpu.usage, 100)}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {healthData.system.cpu.cores} cores • Load:{" "}
              {healthData.system.cpu.loadAverage[0].toFixed(2)}
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Memory</h3>
            <span className="text-2xl">🧠</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span>{formatBytes(healthData.system.memory.used)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(
                  healthData.system.memory.usagePercentage
                )}`}
                style={{
                  width: `${healthData.system.memory.usagePercentage}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {formatBytes(healthData.system.memory.free)} free of{" "}
              {formatBytes(healthData.system.memory.total)}
            </div>
          </div>
        </div>

        {/* Disk Usage */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Disk Space</h3>
            <span className="text-2xl">💾</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span>{healthData.system.disk.usagePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(
                  healthData.system.disk.usagePercentage
                )}`}
                style={{ width: `${healthData.system.disk.usagePercentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {formatBytes(healthData.system.disk.free)} free of{" "}
              {formatBytes(healthData.system.disk.total)}
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Service</h3>
            <span className="text-2xl">🚀</span>
          </div>
          <div className="space-y-2">
            <div
              className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                healthData.service.status
              )}`}
            >
              {healthData.service.status.toUpperCase()}
            </div>
            <div className="text-sm space-y-1">
              <div>
                Uptime: {formatUptime(healthData.service.uptime / 1000)}
              </div>
              <div>Restarts: {healthData.service.restarts}</div>
              <div>Memory: {formatBytes(healthData.service.memory)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Health */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🗄️ Database Health
            </h3>
            <div
              className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                healthData.database.status
              )}`}
            >
              {healthData.database.status.toUpperCase()}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Connection Time:</span>
                <div className="font-medium">
                  {healthData.database.connectionTime}ms
                </div>
              </div>
              <div>
                <span className="text-gray-600">Database Size:</span>
                <div className="font-medium">
                  {healthData.database.databaseSize}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Active Connections:</span>
                <div className="font-medium">
                  {healthData.database.activeConnections} /{" "}
                  {healthData.database.maxConnections}
                </div>
              </div>
            </div>

            {healthData.database.tableStats.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Table Statistics
                </h4>
                <div className="space-y-2">
                  {healthData.database.tableStats
                    .slice(0, 5)
                    .map((table, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{table.tableName}</span>
                        <span className="font-medium">{table.size}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Application Health */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📱 Application Health
            </h3>
            <div className="text-sm text-gray-600">
              v{healthData.application.version} •{" "}
              {healthData.application.environment}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features</h4>
              <div className="space-y-2">
                {healthData.application.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{feature.name}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={
                          feature.enabled ? "text-green-600" : "text-gray-400"
                        }
                      >
                        {feature.enabled ? "✅" : "❌"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {feature.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Endpoints</h4>
              <div className="space-y-2">
                {healthData.application.endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 font-mono">
                      {endpoint.path}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={
                          endpoint.status === 200 ||
                          endpoint.status === 401 ||
                          endpoint.status === 400
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {endpoint.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {endpoint.responseTime}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🖥️ System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Hostname:</span>
            <div className="font-medium font-mono">
              {healthData.system.network.hostname}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Platform:</span>
            <div className="font-medium">
              {healthData.system.network.platform}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Node.js:</span>
            <div className="font-medium">
              {healthData.system.network.nodeVersion}
            </div>
          </div>
          <div>
            <span className="text-gray-600">System Uptime:</span>
            <div className="font-medium">
              {formatUptime(healthData.system.uptime)}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Service PID:</span>
            <div className="font-medium">{healthData.service.pid || "N/A"}</div>
          </div>
          <div>
            <span className="text-gray-600">Last Restart:</span>
            <div className="font-medium">
              {healthData.service.lastRestart
                ? new Date(healthData.service.lastRestart).toLocaleString()
                : "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
