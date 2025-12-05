/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting to prevent abuse of public endpoints.
 *
 * Current implementation uses in-memory storage (suitable for single-instance deployments).
 * For multi-instance deployments, consider upgrading to Redis-backed storage.
 *
 * Usage:
 * ```typescript
 * const limiter = createRateLimiter({ requests: 10, window: 60000 });
 * const result = await limiter.check(identifier);
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */

export interface RateLimiterConfig {
  /**
   * Maximum number of requests allowed within the time window
   */
  requests: number;

  /**
   * Time window in milliseconds
   */
  window: number;

  /**
   * Optional: Custom storage backend (for Redis integration)
   */
  storage?: RateLimiterStorage;
}

export interface RateLimiterStorage {
  get(key: string): Promise<number[]>;
  set(key: string, timestamps: number[], ttl: number): Promise<void>;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
}

/**
 * In-memory storage implementation (default)
 * Note: This does not work across multiple instances.
 * Use Redis storage for distributed deployments.
 */
class InMemoryStorage implements RateLimiterStorage {
  private store = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.store.entries()) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 3600000) {
          this.store.delete(key);
        }
      }
    }, 300000); // 5 minutes

    // Ensure cleanup runs before process exit
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
        clearInterval(this.cleanupInterval);
      });
    }
  }

  async get(key: string): Promise<number[]> {
    return this.store.get(key) || [];
  }

  async set(key: string, timestamps: number[], ttl: number): Promise<void> {
    this.store.set(key, timestamps);
  }
}

/**
 * Rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private config: Required<RateLimiterConfig>;

  constructor(config: RateLimiterConfig) {
    this.config = {
      ...config,
      storage: config.storage || new InMemoryStorage(),
    };
  }

  /**
   * Check if a request should be allowed
   *
   * @param identifier - Unique identifier for the client (IP, user ID, etc.)
   * @returns Rate limit result with success status and metadata
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.config.window;
    const key = `ratelimit:${identifier}`;

    // Get existing timestamps
    let timestamps = await this.config.storage.get(key);

    // Remove timestamps outside the current window
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Check if limit exceeded
    const remaining = Math.max(0, this.config.requests - timestamps.length);
    const success = timestamps.length < this.config.requests;

    if (success) {
      // Add current timestamp
      timestamps.push(now);
      await this.config.storage.set(key, timestamps, this.config.window);
    }

    // Calculate reset time (end of current window)
    const oldestTimestamp = timestamps[0] || now;
    const reset = Math.ceil((oldestTimestamp + this.config.window) / 1000);

    return {
      success,
      limit: this.config.requests,
      remaining,
      reset,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   * Useful for testing or manual intervention
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    await this.config.storage.set(key, [], 0);
  }
}

/**
 * Create a rate limiter instance
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Predefined rate limiters for common use cases
 */
export const RateLimiters = {
  /**
   * Webhook endpoints: 10 requests per minute per IP
   */
  webhook: createRateLimiter({
    requests: 10,
    window: 60000, // 1 minute
  }),

  /**
   * API endpoints: 100 requests per minute per IP
   */
  api: createRateLimiter({
    requests: 100,
    window: 60000, // 1 minute
  }),

  /**
   * Strict endpoints: 5 requests per minute per IP
   */
  strict: createRateLimiter({
    requests: 5,
    window: 60000, // 1 minute
  }),
};

/**
 * Helper to get client identifier from request
 * Uses IP address or falls back to 'anonymous'
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for IP address
  const headers = request.headers;

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to anonymous (all requests will share the same limit)
  return 'anonymous';
}

/**
 * Apply rate limiting headers to response
 * Follows standard RateLimit header format (draft RFC)
 */
export function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('RateLimit-Limit', result.limit.toString());
  headers.set('RateLimit-Remaining', result.remaining.toString());
  headers.set('RateLimit-Reset', result.reset.toString());

  if (!result.success) {
    headers.set('Retry-After', '60'); // Retry after 60 seconds
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
