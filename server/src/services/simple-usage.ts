import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
});

export interface DailyUsage {
  userId: string;
  date: string;
  count: number;
  limit: number;
}

export class SimpleUsageService {
  private static readonly DAILY_LIMIT = 10;

  static async checkLimit(
    userId: string
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const client = await pool.connect();

      // Get or create today's usage
      const result = await client.query(
        `
        INSERT INTO daily_usage (user_id, usage_date, api_calls, daily_limit)
        VALUES ($1, $2, 0, $3)
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET daily_limit = $3
        RETURNING api_calls, daily_limit
      `,
        [userId, today, this.DAILY_LIMIT]
      );

      client.release();

      const current = result.rows[0].api_calls;
      const limit = result.rows[0].daily_limit;
      const remaining = Math.max(0, limit - current);

      return {
        allowed: current < limit,
        current,
        limit,
        remaining,
      };
    } catch (error) {
      console.error("Usage check failed:", error);
      return {
        allowed: true,
        current: 0,
        limit: this.DAILY_LIMIT,
        remaining: this.DAILY_LIMIT,
      };
    }
  }

  static async increment(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const client = await pool.connect();

      const result = await client.query(
        `
        UPDATE daily_usage 
        SET api_calls = api_calls + 1
        WHERE user_id = $1 AND usage_date = $2
        RETURNING api_calls
      `,
        [userId, today]
      );

      client.release();

      return result.rows[0]?.api_calls || 0;
    } catch (error) {
      console.error("Usage increment failed:", error);
      return 0;
    }
  }

  static async getStats(userId: string): Promise<DailyUsage> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const client = await pool.connect();

      const result = await client.query(
        `
        SELECT user_id, usage_date, api_calls, daily_limit
        FROM daily_usage
        WHERE user_id = $1 AND usage_date = $2
      `,
        [userId, today]
      );

      client.release();

      if (result.rows.length === 0) {
        return {
          userId,
          date: today,
          count: 0,
          limit: this.DAILY_LIMIT,
        };
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        date: row.usage_date,
        count: row.api_calls,
        limit: row.daily_limit,
      };
    } catch (error) {
      console.error("Get stats failed:", error);
      return {
        userId,
        date: today,
        count: 0,
        limit: this.DAILY_LIMIT,
      };
    }
  }
}
