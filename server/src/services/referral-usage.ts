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

export interface EnhancedUsageStats {
  allowed: boolean;
  current: number;
  baseLimit: number;
  bonusCalls: number;
  totalLimit: number;
  remaining: number;
  referralStats: {
    referralCode: string;
    totalReferrals: number;
    successfulReferrals: number;
    bonusCallsEarned: number;
  };
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  bonusCallsEarned: number;
}

export interface LimitRequest {
  currentLimit: number;
  requestedLimit: number;
  reason: string;
  useCase?: string;
  company?: string;
}

export class ReferralUsageService {
  private static readonly DAILY_LIMIT = 10;
  private static readonly REFERRAL_BONUS = 2;

  static async checkLimit(userId: string): Promise<EnhancedUsageStats> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const client = await pool.connect();

      // Get user's referral stats and bonus
      const referralResult = await client.query(
        `
        SELECT 
          referral_code,
          total_referrals,
          successful_referrals,
          bonus_calls_earned
        FROM user_referral_stats 
        WHERE user_id = $1
      `,
        [userId]
      );

      let referralStats = {
        referralCode: "",
        totalReferrals: 0,
        successfulReferrals: 0,
        bonusCallsEarned: 0,
      };

      if (referralResult.rows.length === 0) {
        // Create referral stats for new user
        const newCode = await this.generateReferralCode();
        await client.query(
          `
          INSERT INTO user_referral_stats (user_id, referral_code)
          VALUES ($1, $2)
        `,
          [userId, newCode]
        );
        referralStats.referralCode = newCode;
      } else {
        const row = referralResult.rows[0];
        referralStats = {
          referralCode: row.referral_code,
          totalReferrals: row.total_referrals,
          successfulReferrals: row.successful_referrals,
          bonusCallsEarned: row.bonus_calls_earned,
        };
      }

      const bonusCalls = referralStats.bonusCallsEarned;
      const totalLimit = this.DAILY_LIMIT + bonusCalls;

      // Get or create today's usage
      const usageResult = await client.query(
        `
        INSERT INTO daily_usage (user_id, usage_date, api_calls, daily_limit, bonus_calls)
        VALUES ($1, $2, 0, $3, $4)
        ON CONFLICT (user_id, usage_date)
        DO UPDATE SET daily_limit = $3, bonus_calls = $4
        RETURNING api_calls, daily_limit, bonus_calls
      `,
        [userId, today, this.DAILY_LIMIT, bonusCalls]
      );

      client.release();

      const current = usageResult.rows[0].api_calls;
      const baseLimit = usageResult.rows[0].daily_limit;
      const bonusFromDb = usageResult.rows[0].bonus_calls || 0;
      const actualTotalLimit = baseLimit + bonusFromDb;
      const remaining = Math.max(0, actualTotalLimit - current);

      return {
        allowed: current < actualTotalLimit,
        current,
        baseLimit,
        bonusCalls: bonusFromDb,
        totalLimit: actualTotalLimit,
        remaining,
        referralStats,
      };
    } catch (error) {
      console.error("Enhanced usage check failed:", error);
      return {
        allowed: true,
        current: 0,
        baseLimit: this.DAILY_LIMIT,
        bonusCalls: 0,
        totalLimit: this.DAILY_LIMIT,
        remaining: this.DAILY_LIMIT,
        referralStats: {
          referralCode: "",
          totalReferrals: 0,
          successfulReferrals: 0,
          bonusCallsEarned: 0,
        },
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

  static async getReferralInfo(userId: string): Promise<ReferralInfo> {
    try {
      const client = await pool.connect();

      const result = await client.query(
        `
        SELECT 
          referral_code,
          total_referrals,
          successful_referrals,
          bonus_calls_earned
        FROM user_referral_stats 
        WHERE user_id = $1
      `,
        [userId]
      );

      client.release();

      if (result.rows.length === 0) {
        const newCode = await this.generateReferralCode();
        return {
          referralCode: newCode,
          referralLink: `${
            process.env.FRONTEND_URL || "https://prmanagerai.com"
          }?ref=${newCode}`,
          totalReferrals: 0,
          successfulReferrals: 0,
          bonusCallsEarned: 0,
        };
      }

      const row = result.rows[0];
      return {
        referralCode: row.referral_code,
        referralLink: `${
          process.env.FRONTEND_URL || "https://prmanagerai.com"
        }?ref=${row.referral_code}`,
        totalReferrals: row.total_referrals,
        successfulReferrals: row.successful_referrals,
        bonusCallsEarned: row.bonus_calls_earned,
      };
    } catch (error) {
      console.error("Get referral info failed:", error);
      return {
        referralCode: "",
        referralLink: "",
        totalReferrals: 0,
        successfulReferrals: 0,
        bonusCallsEarned: 0,
      };
    }
  }

  static async processReferral(
    referralCode: string,
    newUserEmail: string
  ): Promise<boolean> {
    try {
      const client = await pool.connect();

      // Check if referral code exists and is valid
      const referralCheck = await client.query(
        `
        SELECT referrer_id FROM user_referral_stats 
        WHERE referral_code = $1
      `,
        [referralCode]
      );

      if (referralCheck.rows.length === 0) {
        client.release();
        return false;
      }

      const referrerId = referralCheck.rows[0].referrer_id;

      // Create referral record
      await client.query(
        `
        INSERT INTO referrals (referrer_id, referral_code, referred_email, status)
        VALUES ($1, $2, $3, 'pending')
      `,
        [referrerId, referralCode, newUserEmail]
      );

      // Update referrer's total referrals
      await client.query(
        `
        UPDATE user_referral_stats 
        SET total_referrals = total_referrals + 1
        WHERE user_id = $1
      `,
        [referrerId]
      );

      client.release();
      return true;
    } catch (error) {
      console.error("Process referral failed:", error);
      return false;
    }
  }

  static async completeReferral(
    newUserId: string,
    email: string
  ): Promise<void> {
    try {
      const client = await pool.connect();

      // Find pending referral for this email
      const referralResult = await client.query(
        `
        UPDATE referrals 
        SET referred_user_id = $1, status = 'completed', completed_at = NOW()
        WHERE referred_email = $2 AND status = 'pending'
        RETURNING referrer_id, referral_code
      `,
        [newUserId, email]
      );

      if (referralResult.rows.length > 0) {
        const referrerId = referralResult.rows[0].referrer_id;

        // Grant bonus to referrer
        await client.query(
          `
          UPDATE user_referral_stats 
          SET 
            successful_referrals = successful_referrals + 1,
            bonus_calls_earned = bonus_calls_earned + $1
          WHERE user_id = $2
        `,
          [this.REFERRAL_BONUS, referrerId]
        );

        // Mark bonus as granted
        await client.query(
          `
          UPDATE referrals 
          SET bonus_granted = true
          WHERE referrer_id = $1 AND referred_user_id = $2
        `,
          [referrerId, newUserId]
        );
      }

      client.release();
    } catch (error) {
      console.error("Complete referral failed:", error);
    }
  }

  static async submitLimitRequest(
    userId: string,
    userEmail: string,
    request: LimitRequest
  ): Promise<boolean> {
    try {
      const client = await pool.connect();

      await client.query(
        `
        INSERT INTO limit_requests (
          user_id, user_email, current_limit, requested_limit, 
          reason, use_case, company
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          userId,
          userEmail,
          request.currentLimit,
          request.requestedLimit,
          request.reason,
          request.useCase,
          request.company,
        ]
      );

      client.release();
      return true;
    } catch (error) {
      console.error("Submit limit request failed:", error);
      return false;
    }
  }

  private static async generateReferralCode(): Promise<string> {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "REF";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
