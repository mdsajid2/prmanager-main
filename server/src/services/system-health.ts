import { Pool } from "pg";
import { execSync } from "child_process";
import os from "os";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
});

export interface SystemMetrics {
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

export interface DatabaseHealth {
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

export interface ServiceHealth {
  status: "online" | "offline" | "error";
  pid: number | null;
  uptime: number;
  restarts: number;
  memory: number;
  cpu: number;
  lastRestart: string | null;
}

export interface ApplicationHealth {
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

export class SystemHealthService {
  static async getSystemMetrics(): Promise<SystemMetrics> {
    const startTime = Date.now();

    try {
      // CPU information
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      // Memory information
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Disk information (for the root filesystem)
      let diskInfo = { total: 0, used: 0, free: 0, usagePercentage: 0 };
      try {
        if (process.platform !== "win32") {
          const diskUsage = execSync("df -k / | tail -1", { encoding: "utf8" });
          const parts = diskUsage.trim().split(/\s+/);
          const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
          const used = parseInt(parts[2]) * 1024;
          const free = parseInt(parts[3]) * 1024;

          diskInfo = {
            total,
            used,
            free,
            usagePercentage: (used / total) * 100,
          };
        }
      } catch (error) {
        console.warn("Could not get disk usage:", error);
      }

      // Calculate CPU usage (simplified)
      const cpuUsage = (loadAvg[0] / cpus.length) * 100;

      return {
        timestamp: new Date().toISOString(),
        uptime: os.uptime(),
        cpu: {
          usage: Math.min(cpuUsage, 100),
          loadAverage: loadAvg,
          cores: cpus.length,
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          usagePercentage: (usedMem / totalMem) * 100,
        },
        disk: diskInfo,
        network: {
          hostname: os.hostname(),
          platform: `${os.type()} ${os.release()}`,
          nodeVersion: process.version,
        },
      };
    } catch (error) {
      console.error("Error getting system metrics:", error);
      throw error;
    }
  }

  static async getDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    let client;

    try {
      client = await pool.connect();
      const connectionTime = Date.now() - startTime;

      // Simple connection test
      await client.query("SELECT 1");

      // Get basic database info (simplified for Supabase)
      let maxConn = 100;
      let activeConn = 1;
      let dbSizeStr = "Connected";
      let tableStatsData: any[] = [];

      try {
        // Try to get connection stats (may fail on Supabase)
        const connectionStats = await client.query(`
          SELECT setting as max_connections
          FROM pg_settings 
          WHERE name = 'max_connections'
        `);
        maxConn = parseInt(connectionStats.rows[0]?.max_connections || "100");
      } catch (e) {
        console.log("Could not get connection stats:", e.message);
      }

      try {
        // Try to get database size (may fail on Supabase)
        const dbSize = await client.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `);
        dbSizeStr = dbSize.rows[0]?.size || "Connected";
      } catch (e) {
        console.log("Could not get database size:", e.message);
      }

      try {
        // Try to get table stats (simplified)
        const tableStats = await client.query(`
          SELECT 
            tablename,
            pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
          FROM pg_tables 
          WHERE schemaname = 'public'
          LIMIT 5
        `);
        tableStatsData = tableStats.rows;
      } catch (e) {
        console.log("Could not get table stats:", e.message);
      }

      // Determine health status based on connection time
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (connectionTime > 1000) status = "degraded";
      if (connectionTime > 3000) status = "unhealthy";

      const formattedTableStats = tableStatsData.map((row) => ({
        tableName: row.tablename || "unknown",
        rowCount: 0, // Not available in simplified query
        size: row.size || "0 bytes",
      }));

      return {
        status,
        connectionTime,
        activeConnections: activeConn,
        maxConnections: maxConn,
        databaseSize: dbSizeStr,
        tableStats: formattedTableStats,
        recentErrors: [], // Could be enhanced with actual error log parsing
      };
    } catch (error) {
      console.error("Database health check failed:", error);
      return {
        status: "unhealthy",
        connectionTime: Date.now() - startTime,
        activeConnections: 0,
        maxConnections: 0,
        databaseSize: "Unknown",
        tableStats: [],
        recentErrors: [
          error instanceof Error ? error.message : "Unknown error",
        ],
      };
    } finally {
      if (client) client.release();
    }
  }

  static async getServiceHealth(): Promise<ServiceHealth> {
    try {
      // Try to get PM2 process info
      let pm2Info = null;
      try {
        const pm2Output = execSync("pm2 jlist", { encoding: "utf8" });
        const processes = JSON.parse(pm2Output);
        pm2Info = processes.find((p: any) => p.name === "pr-manager");
      } catch (error) {
        console.warn("Could not get PM2 info:", error);
      }

      if (pm2Info) {
        return {
          status: pm2Info.pm2_env?.status === "online" ? "online" : "offline",
          pid: pm2Info.pid || null,
          uptime: pm2Info.pm2_env?.pm_uptime
            ? Date.now() - pm2Info.pm2_env.pm_uptime
            : 0,
          restarts: pm2Info.pm2_env?.restart_time || 0,
          memory: pm2Info.monit?.memory || 0,
          cpu: pm2Info.monit?.cpu || 0,
          lastRestart: pm2Info.pm2_env?.pm_uptime
            ? new Date(pm2Info.pm2_env.pm_uptime).toISOString()
            : null,
        };
      } else {
        // Fallback to process info
        return {
          status: "online", // If we're running this code, the service is online
          pid: process.pid,
          uptime: process.uptime() * 1000,
          restarts: 0,
          memory: process.memoryUsage().rss,
          cpu: 0,
          lastRestart: null,
        };
      }
    } catch (error) {
      console.error("Error getting service health:", error);
      return {
        status: "error",
        pid: null,
        uptime: 0,
        restarts: 0,
        memory: 0,
        cpu: 0,
        lastRestart: null,
      };
    }
  }

  static async getApplicationHealth(): Promise<ApplicationHealth> {
    try {
      // Read package.json for version
      let version = "Unknown";
      try {
        const packagePath = path.resolve(__dirname, "../../../package.json");
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
          version = packageJson.version || "Unknown";
        }
      } catch (error) {
        console.warn("Could not read package.json:", error);
      }

      // Check feature availability
      const features = [
        {
          name: "Database Connection",
          enabled: !!process.env.DATABASE_URL,
          status: process.env.DATABASE_URL ? "configured" : "missing",
        },
        {
          name: "AI Integration",
          enabled: !!(process.env.OPENAI_API_KEY || process.env.KIRO_API_KEY),
          status: process.env.OPENAI_API_KEY
            ? "openai"
            : process.env.KIRO_API_KEY
            ? "kiro"
            : "system-only",
        },
        {
          name: "GitHub Integration",
          enabled: !!process.env.GITHUB_TOKEN,
          status: process.env.GITHUB_TOKEN ? "configured" : "public-only",
        },
        {
          name: "Authentication",
          enabled: !!process.env.JWT_SECRET,
          status: process.env.JWT_SECRET ? "enabled" : "disabled",
        },
        {
          name: "Referral System",
          enabled: true,
          status: "active",
        },
      ];

      // Test key endpoints
      const endpoints = [];
      const baseUrl = "http://localhost:" + (process.env.PORT || 8080);

      for (const endpoint of [
        "/health",
        "/api/analyze",
        "/api/enhanced-usage",
      ]) {
        try {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "GET",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;

          endpoints.push({
            path: endpoint,
            status: response.status,
            responseTime,
          });
        } catch (error) {
          endpoints.push({
            path: endpoint,
            status: 0,
            responseTime: 0,
          });
        }
      }

      return {
        version,
        environment: process.env.NODE_ENV || "development",
        features,
        endpoints,
      };
    } catch (error) {
      console.error("Error getting application health:", error);
      throw error;
    }
  }

  static async getCompleteHealthReport() {
    try {
      const [systemMetrics, databaseHealth, serviceHealth, applicationHealth] =
        await Promise.all([
          this.getSystemMetrics(),
          this.getDatabaseHealth(),
          this.getServiceHealth(),
          this.getApplicationHealth(),
        ]);

      return {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: databaseHealth,
        service: serviceHealth,
        application: applicationHealth,
        overallStatus: this.calculateOverallStatus(
          databaseHealth,
          serviceHealth
        ),
      };
    } catch (error) {
      console.error("Error generating health report:", error);
      throw error;
    }
  }

  private static calculateOverallStatus(
    db: DatabaseHealth,
    service: ServiceHealth
  ): "healthy" | "degraded" | "unhealthy" {
    if (service.status !== "online" || db.status === "unhealthy") {
      return "unhealthy";
    }
    if (db.status === "degraded" || service.restarts > 5) {
      return "degraded";
    }
    return "healthy";
  }
}
