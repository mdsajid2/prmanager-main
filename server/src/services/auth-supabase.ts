import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

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

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class AuthService {
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

  // Sign up user
  static async signup(
    data: SignupData
  ): Promise<{ user: User; token: string }> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create user profile in custom table
      const userProfile = {
        id: authData.user.id,
        email: data.email.toLowerCase(),
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        company: data.company || null,
        role: data.role || null,
        is_verified: true,
        subscription_plan: "free",
        api_usage_count: 0,
        api_usage_limit: 10,
        created_at: new Date().toISOString(),
      };

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .insert([userProfile])
        .select()
        .single();

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

      const token = this.generateToken(authData.user.id);

      return { user: profileData, token };
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }

  // Login user
  static async login(data: LoginData): Promise<{ user: User; token: string }> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        throw new Error("Invalid email or password");
      }

      if (!authData.user) {
        throw new Error("Authentication failed");
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        throw new Error("User profile not found");
      }

      // Update last login
      await supabase
        .from("user_profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", authData.user.id);

      const token = this.generateToken(authData.user.id);

      return { user: profileData, token };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }

  // Verify session token
  static async verifySession(token: string): Promise<User | null> {
    try {
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }

      return this.getUserById(decoded.userId);
    } catch (error) {
      console.error("Session verification error:", error);
      return null;
    }
  }

  // Logout (invalidate session)
  static async logout(token: string): Promise<void> {
    try {
      // In a full implementation, you might want to maintain a blacklist of tokens
      // For now, we rely on token expiration
      console.log("User logged out");
    } catch (error) {
      console.error("Logout error:", error);
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
    try {
      await supabase.from("user_analytics").insert([
        {
          user_id: userId,
          action,
          metadata,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  }

  // Update API usage
  static async incrementApiUsage(userId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from("user_profiles")
        .select("api_usage_count, api_usage_limit")
        .eq("id", userId)
        .single();

      if (!user || user.api_usage_count >= user.api_usage_limit) {
        return false;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ api_usage_count: user.api_usage_count + 1 })
        .eq("id", userId);

      return !error;
    } catch (error) {
      console.error("API usage increment error:", error);
      return false;
    }
  }
}
