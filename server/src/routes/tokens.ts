import express from "express";
import { AuthService } from "../services/auth";
import { EncryptionService } from "../services/encryption";
import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : false,
});

// Middleware to extract user from token
const authenticateToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const user = await AuthService.verifySession(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get user's stored tokens (returns metadata only, not actual tokens)
router.get("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, token_type, token_name, last_used, created_at, updated_at
         FROM user_tokens 
         WHERE user_id = $1 
         ORDER BY token_type, created_at DESC`,
        [req.user.id]
      );

      res.json({
        tokens: result.rows.map((row) => ({
          id: row.id,
          type: row.token_type,
          name:
            row.token_name ||
            `${
              row.token_type.charAt(0).toUpperCase() + row.token_type.slice(1)
            } Token`,
          lastUsed: row.last_used,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          hasToken: true, // Indicates token exists without revealing it
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get tokens error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Store/update an encrypted token
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { tokenType, token, tokenName } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!tokenType || !token) {
      return res
        .status(400)
        .json({ message: "Token type and token are required" });
    }

    // Validate token type
    const validTypes = ["github", "openai", "anthropic", "gemini"];
    if (!validTypes.includes(tokenType)) {
      return res.status(400).json({ message: "Invalid token type" });
    }

    // Encrypt the token
    const encryptedToken = EncryptionService.encryptGitHubToken(token);

    const client = await pool.connect();
    try {
      // Upsert the token (insert or update if exists)
      const result = await client.query(
        `INSERT INTO user_tokens (user_id, token_type, encrypted_token, token_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, token_type)
         DO UPDATE SET 
           encrypted_token = EXCLUDED.encrypted_token,
           token_name = EXCLUDED.token_name,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, token_type, token_name, created_at, updated_at`,
        [req.user.id, tokenType, encryptedToken, tokenName]
      );

      const savedToken = result.rows[0];

      // Track analytics
      await AuthService.trackAnalytics(
        req.user.id,
        "token_stored",
        { tokenType },
        req.ip,
        req.get("User-Agent")
      );

      res.json({
        message: "Token stored successfully",
        token: {
          id: savedToken.id,
          type: savedToken.token_type,
          name:
            savedToken.token_name ||
            `${
              savedToken.token_type.charAt(0).toUpperCase() +
              savedToken.token_type.slice(1)
            } Token`,
          createdAt: savedToken.created_at,
          updatedAt: savedToken.updated_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Store token error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a stored token
router.delete("/:tokenId", authenticateToken, async (req, res) => {
  try {
    const { tokenId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM user_tokens 
         WHERE id = $1 AND user_id = $2
         RETURNING token_type`,
        [tokenId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Token not found" });
      }

      // Track analytics
      await AuthService.trackAnalytics(
        req.user.id,
        "token_deleted",
        { tokenType: result.rows[0].token_type },
        req.ip,
        req.get("User-Agent")
      );

      res.json({ message: "Token deleted successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete token error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get decrypted token for internal use (not exposed to frontend)
export async function getDecryptedToken(
  userId: string,
  tokenType: string
): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT encrypted_token FROM user_tokens 
       WHERE user_id = $1 AND token_type = $2`,
      [userId, tokenType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last_used timestamp
    await client.query(
      `UPDATE user_tokens SET last_used = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND token_type = $2`,
      [userId, tokenType]
    );

    // Decrypt and return the token
    return EncryptionService.decryptGitHubToken(result.rows[0].encrypted_token);
  } finally {
    client.release();
  }
}

export default router;
