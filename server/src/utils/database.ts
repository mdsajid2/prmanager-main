import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Database connection configuration with error handling
export const createDatabasePool = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  });

  // Handle pool errors
  pool.on("error", (err) => {
    console.error("❌ Database pool error:", err);
    console.log("🔄 Attempting to reconnect...");
  });

  // Handle client connection errors
  pool.on("connect", (client) => {
    console.log("✅ Database client connected");

    client.on("error", (err) => {
      console.error("❌ Database client error:", err);
    });
  });

  // Test the connection
  pool
    .connect()
    .then((client) => {
      console.log("✅ Database pool initialized successfully");
      client.release();
    })
    .catch((err) => {
      console.error("❌ Failed to initialize database pool:", err.message);
    });

  return pool;
};

// Utility function for safe database queries
export const safeQuery = async (
  pool: Pool,
  query: string,
  params: any[] = []
) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error("❌ Database query error:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Utility function for transactions
export const withTransaction = async (
  pool: Pool,
  callback: (client: any) => Promise<any>
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Transaction error:", error);
    throw error;
  } finally {
    client.release();
  }
};
