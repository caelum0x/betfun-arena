import { Pool, PoolClient } from "pg";

// Neon PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_Uc5QOeRDl8PY@ep-late-pond-adx44wl9-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Create connection pool
let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
}

/**
 * Execute a query and return results
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a query and return the number of affected rows
 */
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT NOW()");
    return result.length > 0;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

/**
 * Close all database connections
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

