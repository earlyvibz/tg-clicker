/**
 * Queue Priority Delays (in milliseconds)
 * Calibrated for ~150 concurrent MEDIUM priority sessions at 30 edits/s Telegram limit
 */
export const PRIORITY_DELAYS = {
  HIGH: 2000,
  MEDIUM: 10000,
  LOW: 60000,
} as const;

/**
 * Activity Thresholds (in milliseconds)
 */
export const THRESHOLDS = {
  HIGH_PRIORITY_CLICK: 30000,
  MEDIUM_PRIORITY_HEARTBEAT: 120000,
  LOW_PRIORITY_HEARTBEAT: 300000,
  STALE_SESSION: 300000,
  SESSION_TTL: 600,
} as const;

/**
 * Queue Configuration
 */
export const QUEUE_CONFIG = {
  CONCURRENCY: 30,
  RATE_LIMIT_PER_SECOND: 30,
  BATCH_SIZE: 20,
  METRICS_REPORT_INTERVAL: 30000,
  SESSION_SYNC_INTERVAL: 60000,
} as const;

/**
 * User-facing Messages
 */
export const MESSAGES = {
  WELCOME:
    "👋 Welcome! Please set your username (3-50 characters, alphanumeric):",
  CHANGE_USERNAME_PROMPT:
    "Enter your new username (3-50 characters, alphanumeric):",
  USERNAME_SET: (username: string) => `✅ Username set to: ${username}`,
  USERNAME_UPDATED: (username: string) => `✅ Username updated to: ${username}`,
  USERNAME_INVALID:
    "❌ Username must be 3-50 characters and alphanumeric. Try again:",
  ERROR_GENERIC: "❌ Something went wrong. Please try again.",
  ERROR_USERNAME: "❌ Failed to set username. Please try again.",
  ERROR_STATS: "❌ Failed to load stats. Please try again.",
} as const;

/**
 * Username Validation
 */
export const USERNAME_VALIDATION = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 50,
  PATTERN: /^[a-zA-Z0-9_]+$/,
} as const;
