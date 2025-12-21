import { query } from '../models/database';
import type { QueryResult } from 'pg';

// Helper functions for common database operations

export async function dbGet<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

export async function dbAll<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await query(sql, params);
  return result.rows;
}

export async function dbRun(sql: string, params?: any[]): Promise<QueryResult> {
  return query(sql, params);
}

export type { QueryResult };

