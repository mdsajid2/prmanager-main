import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Pool } from "pg";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Debug: Check if DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  console.log("Looking for .env at:", path.resolve(__dirname, "../../../.env"));
} else {
  console.log("✅ DATABASE_URL loaded successfully");
}

// Database connection with improved configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 15000, // Return an error after 15 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  is_verified: boolean;
  subscription_plan: string;
  api_usage_count: number;
  api_usage_limit: number;
  created_at: string;
}

export interface SignupData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const SALT_ROUNDS = 12;

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  }

  // Verify JWT token
  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }

  // Generate verification token
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // Sign up user
  static async signup(
    data: SignupData
  ): Promise<{ user: User; token: string }> {
    const client = await pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [data.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);
      const verificationToken = this.generateVerificationToken();

      // Insert user
      const result = await client.query(
        `
        INSERT INTO users (
          email, password_hash, first_name, last_name, company, role, verification_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, first_name, last_name, company, role, is_verified, 
                  subscription_plan, api_usage_count, api_usage_limit, created_at
      `,
        [
          data.email.toLowerCase(),
          passwordHash,
          data.first_name || null,
          data.last_name || null,
          data.company || null,
          data.role || null,
          verificationToken,
        ]
      );

      const user = result.rows[0];
      const token = this.generateToken(user.id);

      // Create session
      await client.query(
        `
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES ($1, $2, $3)
      `,
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      return { user, token };
    } finally {
      client.release();
    }
  }

  // Login user
  static async login(data: LoginData): Promise<{ user: User; token: string }> {
    const client = await pool.connect();

    try {
      // Get user by email
      const result = await client.query(
        `
        SELECT id, email, password_hash, first_name, last_name, company, role, 
               is_verified, subscription_plan, api_usage_count, api_usage_limit, created_at
        FROM users WHERE email = $1
      `,
        [data.email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await this.verifyPassword(
        data.password,
        user.password_hash
      );
      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      // Generate token
      const token = this.generateToken(user.id);

      // Update last login
      await client.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
        [user.id]
      );

      // Create session
      await client.query(
        `
        INSERT INTO user_sessions (user_id, session_token, expires_at)
        VALUES ($1, $2, $3)
      `,
        [user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      // Remove password_hash from response
      delete user.password_hash;

      return { user, token };
    } finally {
      client.release();
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT id, email, first_name, last_name, company, role, is_verified,
               subscription_plan, api_usage_count, api_usage_limit, created_at
        FROM users WHERE id = $1
      `,
        [userId]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Verify session token
  static async verifySession(token: string): Promise<User | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT u.id, u.email, u.first_name, u.last_name, u.company, u.role, 
               u.is_verified, u.subscription_plan, u.api_usage_count, u.api_usage_limit, u.created_at
        FROM users u
        JOIN user_sessions s ON u.id = s.user_id
        WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP
      `,
        [token]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Logout (invalidate session)
  static async logout(token: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("DELETE FROM user_sessions WHERE session_token = $1", [
        token,
      ]);
    } finally {
      client.release();
    }
  }

  // Track user analytics
  static async trackAnalytics(
    userId: string,
    action: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query(
        `
        INSERT INTO user_analytics (user_id, action, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          userId,
          action,
          metadata ? JSON.stringify(metadata) : null,
          ipAddress,
          userAgent,
        ]
      );
    } finally {
      client.release();
    }
  }

  // Update API usage
  static async incrementApiUsage(userId: string): Promise<boolean> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        UPDATE users 
        SET api_usage_count = api_usage_count + 1 
        WHERE id = $1 AND api_usage_count < api_usage_limit
        RETURNING api_usage_count, api_usage_limit
      `,
        [userId]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
}
