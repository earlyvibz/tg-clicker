import { enqueueUpdate, determinePriority } from "./queue/updateQueue";
import Redis from "ioredis";
import { THRESHOLDS, QUEUE_CONFIG } from "./constants";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Register a new active session when a user opens the mini app.
 * Stores session data in Redis with TTL and enqueues initial update.
 */
export async function registerSession(
  telegramId: number,
  chatId: number,
  messageId: number
) {
  const sessionId = `${telegramId}:${chatId}`;
  const now = Date.now();

  await redis.hset(`session:${sessionId}`, {
    telegramId: telegramId.toString(),
    chatId: chatId.toString(),
    messageId: messageId.toString(),
    lastHeartbeat: now.toString(),
    lastClickTime: now.toString(),
  });

  await redis.expire(`session:${sessionId}`, THRESHOLDS.SESSION_TTL);

  await enqueueUpdate({
    telegramId,
    chatId,
    messageId,
    lastClickTime: now,
    lastHeartbeat: now,
  });

  console.log(`[Session] Registered session ${sessionId}`);
}

export async function unregisterSession(telegramId: number, chatId: number) {
  const sessionId = `${telegramId}:${chatId}`;
  await redis.del(`session:${sessionId}`);
  console.log(`[Session] Unregistered session ${sessionId}`);
}

export async function updateHeartbeat(telegramId: number, chatId: number) {
  const sessionId = `${telegramId}:${chatId}`;
  const now = Date.now();

  await redis.hset(`session:${sessionId}`, "lastHeartbeat", now.toString());
  await redis.expire(`session:${sessionId}`, THRESHOLDS.SESSION_TTL);
}

/**
 * Sync all active sessions from Redis and enqueue updates.
 * Cleans up stale sessions (no heartbeat for > 5 minutes).
 * Determines priority based on recent activity.
 */
async function syncSessionsFromRedis() {
  try {
    const keys = await redis.keys("session:*");

    for (const key of keys) {
      const sessionData = await redis.hgetall(key);

      if (!sessionData.telegramId) continue;

      const telegramId = parseInt(sessionData.telegramId || "0");
      const chatId = parseInt(sessionData.chatId || "0");
      const messageId = parseInt(sessionData.messageId || "0");
      const lastHeartbeat = parseInt(sessionData.lastHeartbeat || "0");
      const lastClickTime = parseInt(sessionData.lastClickTime || "0");

      const timeSinceHeartbeat = Date.now() - lastHeartbeat;

      if (timeSinceHeartbeat > THRESHOLDS.STALE_SESSION) {
        await redis.del(key);
        console.log(`[Session] Removed stale session ${key}`);
        continue;
      }

      const priority = determinePriority(lastClickTime, lastHeartbeat);

      await enqueueUpdate(
        {
          telegramId,
          chatId,
          messageId,
          lastClickTime,
          lastHeartbeat,
        },
        priority
      );
    }

    console.log(`[Session] Synced ${keys.length} sessions from Redis`);
  } catch (error) {
    console.error("[Session] Failed to sync from Redis:", error);
  }
}

export function startSessionSync() {
  syncSessionsFromRedis();
  setInterval(
    () => syncSessionsFromRedis(),
    QUEUE_CONFIG.SESSION_SYNC_INTERVAL
  );

  console.log("[Session] Session sync started");
}
