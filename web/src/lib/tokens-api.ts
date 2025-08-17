import axios from "axios";

// Smart API base URL detection (same logic as auth-api.ts)
const getApiBase = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }

  // Check if we're running on localhost (development)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("localhost");

  // If running on localhost, use localhost API
  if (isLocalhost) {
    return "http://localhost:3001/api";
  }

  // Production: use relative path for internal calls
  return "/api"; // Internal calls - same server, no internet round trip
};

const API_BASE_URL = getApiBase();

export interface StoredToken {
  id: string;
  type: string;
  name: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  hasToken: boolean;
}

export interface StoreTokenRequest {
  tokenType: "github" | "openai" | "anthropic" | "gemini";
  token: string;
  tokenName?: string;
}

class TokensAPI {
  private getHeaders(authToken: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
  }

  async getStoredTokens(authToken: string): Promise<{ tokens: StoredToken[] }> {
    const response = await axios.get(`${API_BASE_URL}/tokens`, {
      headers: this.getHeaders(authToken),
    });
    return response.data;
  }

  async storeToken(
    authToken: string,
    tokenData: StoreTokenRequest
  ): Promise<{ message: string; token: StoredToken }> {
    const response = await axios.post(`${API_BASE_URL}/tokens`, tokenData, {
      headers: this.getHeaders(authToken),
    });
    return response.data;
  }

  async deleteToken(
    authToken: string,
    tokenId: string
  ): Promise<{ message: string }> {
    const response = await axios.delete(`${API_BASE_URL}/tokens/${tokenId}`, {
      headers: this.getHeaders(authToken),
    });
    return response.data;
  }
}

export const tokensAPI = new TokensAPI();
