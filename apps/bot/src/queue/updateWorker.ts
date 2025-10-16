import { Worker, type Job } from "bullmq";
import type { Telegraf } from "telegraf";
import Redis from "ioredis";
import { getStats } from "../api";
import { formatWelcomeMessage } from "../utils";
import { updateQueue, type UpdateJobData } from "./updateQueue";
import { incrementMetric, incrementError } from "./metrics";
import { QUEUE_CONFIG } from "../constants";

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  }
);

/**
 * Cache to avoid sending duplicate messages to Telegram.
 * Key: sessionId, Value: last message sent
 */
const messageCache = new Map<string, string>();

/**
 * Track which priority queues are paused due to rate limiting or load.
 * When Telegram returns 429 or queue is too large, we pause lower priority queues temporarily.
 */
const isPaused = {
  LOW: false,
  MEDIUM: false,
};

export function pausePriorityQueue(
  priority: "LOW" | "MEDIUM",
  duration: number
) {
  if (isPaused[priority]) return;

  isPaused[priority] = true;
  console.log(`[Worker] Pausing ${priority} priority for ${duration}ms`);

  setTimeout(() => {
    isPaused[priority] = false;
    console.log(`[Worker] Resuming ${priority} priority`);
  }, duration);
}

async function checkQueueLoad() {
  try {
    const waiting = await updateQueue.getWaitingCount();
    const delayed = await updateQueue.getDelayedCount();
    const totalPending = waiting + delayed;

    if (totalPending > 1000 && !isPaused.LOW) {
      pausePriorityQueue("LOW", 120000);
      console.log(
        `[Worker] 🔴 Queue overload (${totalPending}), pausing LOW priority`
      );
    } else if (totalPending > 500 && !isPaused.MEDIUM) {
      pausePriorityQueue("MEDIUM", 60000);
      console.log(
        `[Worker] 🟡 High queue load (${totalPending}), pausing MEDIUM priority`
      );
    }
  } catch (error) {
    console.error("[Worker] Error checking queue load:", error);
  }
}

export function createUpdateWorker(bot: Telegraf) {
  const worker = new Worker<UpdateJobData>(
    "message-updates",
    async (job: Job<UpdateJobData>) => {
      const { telegramId, chatId, messageId } = job.data;
      const sessionId = `${telegramId}:${chatId}`;

      if (job.opts.priority === 10 && isPaused.LOW) {
        throw new Error("LOW priority paused");
      }
      if (job.opts.priority === 5 && isPaused.MEDIUM) {
        throw new Error("MEDIUM priority paused");
      }

      try {
        const stats = await getStats(telegramId);

        const message = formatWelcomeMessage(
          stats.userStats.username,
          stats.userStats.clicks,
          stats.globalStats.totalClicks,
          stats.leaderboard
        );

        const lastMessage = messageCache.get(sessionId);
        if (lastMessage === message) {
          incrementMetric("skipped");
          return { skipped: true };
        }

        await bot.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          message,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 Play Game",
                    web_app: {
                      url: process.env.MINI_APP_URL as string,
                    },
                  },
                ],
                [
                  {
                    text: "📝 Change Username",
                    callback_data: "change_username",
                  },
                ],
              ],
            },
          }
        );

        messageCache.set(sessionId, message);
        incrementMetric("success");

        return { success: true };
      } catch (error: unknown) {
        const err = error as {
          response?: { error_code?: number; description?: string };
          message?: string;
        };

        if (err?.response?.error_code === 429) {
          incrementError("rate_limit");
          console.error(`[Worker] Rate limit hit for session ${sessionId}`);
          throw error;
        } else if (
          err?.response?.error_code === 400 &&
          (err?.response?.description?.includes("message is not modified") ||
            err?.response?.description?.includes("message to edit not found"))
        ) {
          incrementMetric("invalid_session");
          return { invalid: true };
        } else {
          incrementError("other");
          console.error(
            `[Worker] Error updating session ${sessionId}:`,
            err?.message
          );
          throw error;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: QUEUE_CONFIG.CONCURRENCY,
      limiter: {
        max: QUEUE_CONFIG.RATE_LIMIT_PER_SECOND,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Completed job ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(`[Worker] Job ${job.id} failed:`, err.message);
    }
  });

  setInterval(checkQueueLoad, 30000);

  console.log("[Worker] Update worker started with concurrency 30");

  return worker;
}
