import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-cbc";

// Ensure we have a consistent encryption key
if (!process.env.ENCRYPTION_KEY) {
  console.warn(
    "⚠️  ENCRYPTION_KEY not set in .env - using temporary key (not recommended for production)"
  );
}

export class EncryptionService {
  /**
   * Encrypt sensitive data like GitHub tokens
   */
  static encrypt(text: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: { encrypted: string; iv: string }): string {
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Encrypt GitHub token for database storage
   */
  static encryptGitHubToken(token: string): string {
    const encrypted = this.encrypt(token);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt GitHub token from database
   */
  static decryptGitHubToken(encryptedToken: string): string {
    const encryptedData = JSON.parse(encryptedToken);
    return this.decrypt(encryptedData);
  }

  /**
   * Generate a secure encryption key (for setup)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}
