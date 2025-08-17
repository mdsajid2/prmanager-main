import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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

import fs from "fs";
import path from "path";

// Persistent storage for development
const STORAGE_FILE = path.join(__dirname, "../../.auth-storage.json");
const users: Map<string, User & { password_hash: string }> = new Map();
const sessions: Map<string, { userId: string; expires: Date }> = new Map();

// Load users from file on startup
const loadUsers = () => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, "utf8"));
      if (data.users) {
        Object.entries(data.users).forEach(
          ([email, userData]: [string, any]) => {
            users.set(email, userData);
          }
        );
      }
      console.log("🔐 Loaded", users.size, "users from storage");
    } else {
      console.log("🔐 No existing user storage found - starting fresh");
    }
  } catch (error) {
    console.error("🔐 Error loading user storage:", error);
  }
};

// Save users to file
const saveUsers = () => {
  try {
    const data = {
      users: Object.fromEntries(users.entries()),
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("🔐 Error saving user storage:", error);
  }
};

// Create test user from environment variables
const createTestUser = async () => {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;
  const testName = process.env.TEST_USER_NAME || "Test User";

  if (testEmail && testPassword && !users.has(testEmail.toLowerCase())) {
    console.log("🔐 Creating test user from environment variables...");

    try {
      const passwordHash = await bcrypt.hash(testPassword, SALT_ROUNDS);
      const testUser = {
        id: "test-user-123",
        email: testEmail.toLowerCase(),
        password_hash: passwordHash,
        first_name: testName.split(" ")[0] || "Test",
        last_name: testName.split(" ")[1] || "User",
        company: "PR Manager",
        role: "developer",
        is_verified: true,
        subscription_plan: "free",
        api_usage_count: 0,
        api_usage_limit: 100,
        created_at: new Date().toISOString(),
      };

      users.set(testUser.email, testUser);
      saveUsers();
      console.log("✅ Test user created:", testUser.email);
    } catch (error) {
      console.error("❌ Failed to create test user:", error);
    }
  } else if (testEmail && users.has(testEmail.toLowerCase())) {
    console.log("✅ Test user already exists:", testEmail);
  }
};

// Initialize storage
loadUsers();

// Create test user if configured (immediately, not in setTimeout)
if (process.env.NODE_ENV === "development") {
  createTestUser().catch(console.error);
}

console.log("🔐 Authentication service initialized");
console.log("   Users in storage:", users.size);

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
    // Check if user already exists
    if (users.has(data.email.toLowerCase())) {
      throw new Error("User already exists with this email");
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);
    const userId = crypto.randomUUID();

    const newUser = {
      id: userId,
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: data.first_name || undefined,
      last_name: data.last_name || undefined,
      company: data.company || undefined,
      role: data.role || undefined,
      is_verified: false,
      subscription_plan: "free",
      api_usage_count: 0,
      api_usage_limit: 10,
      created_at: new Date().toISOString(),
    };

    users.set(newUser.email, newUser);

    // Save to persistent storage
    saveUsers();

    const token = this.generateToken(userId);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    sessions.set(token, { userId, expires });

    console.log("🔐 New user registered:", newUser.email);
    console.log("   Total users:", users.size);

    // Return user without password_hash
    const { password_hash, ...user } = newUser;
    return { user, token };
  }

  // Login user
  static async login(data: LoginData): Promise<{ user: User; token: string }> {
    console.log("🔐 Login attempt for:", data.email);
    console.log("🔐 Available users:", Array.from(users.keys()));
    console.log("🔐 Total users in storage:", users.size);

    const user = users.get(data.email.toLowerCase());
    if (!user) {
      console.log("❌ User not found for email:", data.email.toLowerCase());
      console.log("🔐 Attempting to reload users from storage...");
      loadUsers();
      const reloadedUser = users.get(data.email.toLowerCase());
      if (!reloadedUser) {
        console.log("❌ User still not found after reload");
        throw new Error("Invalid email or password");
      }
      console.log("✅ User found after reload:", reloadedUser.email);
      // Use the reloaded user
      const isValidPassword = await this.verifyPassword(
        data.password,
        reloadedUser.password_hash
      );
      if (!isValidPassword) {
        console.log("❌ Invalid password for user:", reloadedUser.email);
        throw new Error("Invalid email or password");
      }

      const token = this.generateToken(reloadedUser.id);
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      sessions.set(token, { userId: reloadedUser.id, expires });

      console.log("✅ Login successful for:", reloadedUser.email);
      const { password_hash, ...userWithoutPassword } = reloadedUser;
      return { user: userWithoutPassword, token };
    }

    console.log("✅ User found:", user.email);

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
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    sessions.set(token, { userId: user.id, expires });

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    for (const user of users.values()) {
      if (user.id === userId) {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    }
    return null;
  }

  // Verify session token
  static async verifySession(token: string): Promise<User | null> {
    const session = sessions.get(token);
    if (!session || session.expires < new Date()) {
      sessions.delete(token);
      return null;
    }

    return this.getUserById(session.userId);
  }

  // Logout (invalidate session)
  static async logout(token: string): Promise<void> {
    sessions.delete(token);
  }

  // Track user analytics (mock implementation)
  static async trackAnalytics(
    userId: string,
    action: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    console.log(`Analytics: ${userId} performed ${action}`, {
      metadata,
      ipAddress,
      userAgent,
    });
  }

  // Update API usage (mock implementation)
  static async incrementApiUsage(userId: string): Promise<boolean> {
    for (const [email, user] of users.entries()) {
      if (user.id === userId && user.api_usage_count < user.api_usage_limit) {
        user.api_usage_count++;
        users.set(email, user);
        return true;
      }
    }
    return false;
  }
}
