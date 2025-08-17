import React, { createContext, useContext, useState, useEffect } from "react";
import { User, authAPI, LoginData, SignupData } from "../lib/auth-api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const isAuthenticated = (!!user && !!token) || isGuest;

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const guestMode = localStorage.getItem("guest_mode");

    if (savedToken) {
      setToken(savedToken);
      verifyAndLoadUser(savedToken);
    } else if (guestMode === "true") {
      setIsGuest(true);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyAndLoadUser = async (authToken: string) => {
    try {
      const userData = await authAPI.getCurrentUser(authToken);
      setUser(userData);
      setToken(authToken);
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(data);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem("auth_token", response.token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.signup({
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        company: data.company,
        role: data.role,
      });
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem("auth_token", response.token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Signup failed";
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    setIsLoading(false);
    localStorage.setItem("guest_mode", "true");

    // Create a mock guest user for UI purposes
    setUser({
      id: "guest",
      email: "guest@prmanager.com",
      first_name: "Guest",
      last_name: "User",
      is_verified: false,
      subscription_plan: "guest",
      api_usage_count: 0,
      api_usage_limit: 0,
      created_at: new Date().toISOString(),
    });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token && !isGuest) {
        await authAPI.logout(token);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear user-specific settings on logout
      if (user?.id && user.id !== "guest") {
        const userSettingsKey = `pr-manager-settings-${user.id}`;
        localStorage.removeItem(userSettingsKey);
      }

      // Clear legacy global settings (cleanup)
      localStorage.removeItem("pr-manager-settings");
      localStorage.removeItem("guest_mode");

      setUser(null);
      setToken(null);
      setIsGuest(false);
      localStorage.removeItem("auth_token");
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    isGuest,
    login,
    signup,
    continueAsGuest,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
