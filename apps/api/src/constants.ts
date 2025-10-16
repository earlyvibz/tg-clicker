/**
 * Database Configuration
 */
export const DB_CONFIG = {
  MAX_CONNECTIONS: 15,
  IDLE_TIMEOUT: 60,
  CONNECT_TIMEOUT: 30,
  MAX_LIFETIME: 1800,
} as const;

/**
 * Rate Limiting
 */
export const RATE_LIMITS = {
  CLICKS_PER_SECOND: 20,
} as const;

/**
 * Background Job Intervals (in milliseconds)
 */
export const SYNC_INTERVALS = {
  REDIS_TO_DB: 300000,
  CLEANUP_SESSIONS: 300000,
} as const;

/**
 * Batch Processing
 */
export const BATCH_CONFIG = {
  DB_SYNC_SIZE: 500,
  LEADERBOARD_LIMIT: 1000,
  TOP_LEADERBOARD_DISPLAY: 20,
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  STALE_THRESHOLD: 60000,
  REDIS_TTL: 600,
} as const;
