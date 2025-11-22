import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// ========== SUPABASE CONNECTION POOL ==========

let supabaseClient: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  });

  console.log('Supabase client initialized');
  return supabaseClient;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

// ========== POSTGRES CONNECTION POOL ==========

let pgPool: Pool | null = null;

export interface PoolConfig {
  max?: number; // Maximum number of clients
  min?: number; // Minimum number of clients
  idleTimeoutMillis?: number; // How long a client can be idle before being closed
  connectionTimeoutMillis?: number; // How long to wait for a connection
}

export function initPostgresPool(config?: PoolConfig): Pool {
  if (pgPool) {
    return pgPool;
  }

  // Parse Supabase connection string
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not configured');
  }

  // Extract database connection details from Supabase URL
  // Format: https://xxxxx.supabase.co → postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_KEY;
  
  const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

  pgPool = new Pool({
    connectionString,
    max: config?.max || 20, // Maximum 20 connections
    min: config?.min || 5, // Minimum 5 connections
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000, // 30 seconds
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 10000, // 10 seconds
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Handle pool errors
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  pgPool.on('connect', () => {
    console.log('New client connected to pool');
  });

  pgPool.on('remove', () => {
    console.log('Client removed from pool');
  });

  console.log('PostgreSQL connection pool initialized');
  return pgPool;
}

export function getPool(): Pool {
  if (!pgPool) {
    return initPostgresPool();
  }
  return pgPool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with automatic connection management
 */
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pgPool) {
    return null;
  }

  return {
    totalConnections: pgPool.totalCount,
    idleConnections: pgPool.idleCount,
    waitingRequests: pgPool.waitingCount,
  };
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    console.log('PostgreSQL connection pool closed');
  }
}

// ========== QUERY BUILDER HELPERS ==========

export class QueryBuilder {
  private table: string;
  private conditions: string[] = [];
  private params: any[] = [];
  private orderByClause?: string;
  private limitClause?: number;
  private offsetClause?: number;

  constructor(table: string) {
    this.table = table;
  }

  where(field: string, operator: string, value: any): this {
    this.params.push(value);
    this.conditions.push(`${field} ${operator} $${this.params.length}`);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(limit: number): this {
    this.limitClause = limit;
    return this;
  }

  offset(offset: number): this {
    this.offsetClause = offset;
    return this;
  }

  async select<T = any>(fields: string = '*'): Promise<T[]> {
    let sql = `SELECT ${fields} FROM ${this.table}`;
    
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      sql += ` LIMIT ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      sql += ` OFFSET ${this.offsetClause}`;
    }

    return query<T>(sql, this.params);
  }

  async count(): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.table}`;
    
    if (this.conditions.length > 0) {
      sql += ` WHERE ${this.conditions.join(' AND ')}`;
    }

    const result = await query<{ count: string }>(sql, this.params);
    return parseInt(result[0].count);
  }
}

// ========== EXPORTS ==========

export default {
  initSupabase,
  getSupabase,
  initPostgresPool,
  getPool,
  query,
  transaction,
  getPoolStats,
  closePool,
  QueryBuilder,
};

