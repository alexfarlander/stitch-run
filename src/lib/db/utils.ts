import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Database error wrapper for consistent error handling
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Handles Supabase query errors and throws DatabaseError
 */
export function handleDatabaseError(error: unknown, operation: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    const dbError = error as { message: string; code?: string; details?: unknown };
    throw new DatabaseError(
      `Database error during ${operation}: ${dbError.message}`,
      dbError.code,
      dbError.details
    );
  }
  throw new DatabaseError(`Unknown database error during ${operation}`);
}

/**
 * Executes a database operation with error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  operation: string
): Promise<T> {
  const { data, error } = await queryFn();
  
  if (error) {
    handleDatabaseError(error, operation);
  }
  
  if (data === null) {
    throw new DatabaseError(`No data returned from ${operation}`);
  }
  
  return data;
}

/**
 * Validates that a client is properly initialized
 */
export function validateClient(client: SupabaseClient): void {
  if (!client) {
    throw new DatabaseError('Supabase client is not initialized');
  }
}

/**
 * Performs a transaction-like operation using Supabase RPC
 * Note: For true ACID transactions, use Supabase RPC functions or direct PostgreSQL
 */
export async function withTransaction<T>(
  client: SupabaseClient,
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  validateClient(client);
  
  try {
    return await operation(client);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError('Transaction failed', undefined, error);
  }
}
