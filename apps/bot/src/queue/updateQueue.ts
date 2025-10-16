import { Queue } from "bullmq";
import Redis from "ioredis";
import { PRIORITY_DELAYS, THRESHOLDS } from "../constants";

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  }
);

/**
 * Priority levels for message updates (lower number = higher priority in BullMQ):
 * HIGH (1): Recent click activity (< 30s) - 2s delay
 * MEDIUM (5): Active session (< 2min since heartbeat) - 10s delay
 * LOW (10): Inactive session (< 5min since heartbeat) - 60s delay
 *
 * Note: With Telegram's 30 edits/s limit, optimal capacity is ~300 MEDIUM priority sessions
 * Queue will accumulate if concurrent sessions exceed this threshold
 */
export enum Priority {
  HIGH = 1,
  MEDIUM = 5,
  LOW = 10,
}

export interface UpdateJobData {
  telegramId: number;
  chatId: number;
  messageId: number;
  lastClickTime?: number;
  lastHeartbeat: number;
}

export const updateQueue = new Queue<UpdateJobData>("message-updates", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600,
    },
    removeOnFail: {
      count: 1000,
      age: 86400,
    },
  },
});

export async function enqueueUpdate(
  jobData: UpdateJobData,
  priority: Priority = Priority.MEDIUM
): Promise<void> {
  const delay = getDelayForPriority(priority);

  await updateQueue.add("update-message", jobData, {
    priority,
    delay,
  });
}

function getDelayForPriority(priority: Priority): number {
  switch (priority) {
    case Priority.HIGH:
      return PRIORITY_DELAYS.HIGH;
    case Priority.MEDIUM:
      return PRIORITY_DELAYS.MEDIUM;
    case Priority.LOW:
      return PRIORITY_DELAYS.LOW;
    default:
      return PRIORITY_DELAYS.MEDIUM;
  }
}

/**
 * Determine message update priority based on user activity.
 * Users who clicked recently get HIGH priority for instant feedback.
 * Active users (heartbeat) get MEDIUM priority.
 * Inactive users get LOW priority.
 */
export function determinePriority(
  lastClickTime: number | undefined,
  lastHeartbeat: number
): Priority {
  const now = Date.now();

  if (lastClickTime && now - lastClickTime < THRESHOLDS.HIGH_PRIORITY_CLICK) {
    return Priority.HIGH;
  }

  const timeSinceHeartbeat = now - lastHeartbeat;

  if (timeSinceHeartbeat < THRESHOLDS.MEDIUM_PRIORITY_HEARTBEAT) {
    return Priority.MEDIUM;
  }

  if (timeSinceHeartbeat < THRESHOLDS.LOW_PRIORITY_HEARTBEAT) {
    return Priority.LOW;
  }

  return Priority.LOW;
}

console.log("[Queue] Update queue initialized");
