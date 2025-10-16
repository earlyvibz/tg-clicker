import { db } from "../../db/db";
import { users, sessions } from "../../db/schema";
import { redis, getLeaderboard } from "../redis";
import { lt, sql } from "drizzle-orm";
import { SYNC_INTERVALS, BATCH_CONFIG, SESSION_CONFIG } from "../constants";

/**
 * Sync user data from Redis to PostgreSQL.
 * Uses bulk upsert in batches to avoid saturating the database connection pool.
 * Runs every 5 minutes.
 */
export async function syncRedisToPostgres() {
  try {
    const leaderboard = await getLeaderboard(BATCH_CONFIG.LEADERBOARD_LIMIT);

    if (leaderboard.length === 0) {
      console.log("[Sync] No users to sync");
      return;
    }

    let synced = 0;

    for (let i = 0; i < leaderboard.length; i += BATCH_CONFIG.DB_SYNC_SIZE) {
      const batch = leaderboard.slice(i, i + BATCH_CONFIG.DB_SYNC_SIZE);

      const values = batch.map((entry) => ({
        telegramId: entry.telegramId,
        username: entry.username,
        totalClicks: entry.clicks,
        updatedAt: new Date(),
      }));

      await db
        .insert(users)
        .values(values)
        .onConflictDoUpdate({
          target: users.telegramId,
          set: {
            totalClicks: sql`excluded.total_clicks`,
            updatedAt: sql`excluded.updated_at`,
          },
        });

      synced += batch.length;

      if (i + BATCH_CONFIG.DB_SYNC_SIZE < leaderboard.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[Sync] Synced ${synced} users from Redis to PostgreSQL`);
  } catch (error) {
    console.error("[Sync] Error syncing Redis to PostgreSQL:", error);
  }
}

/**
 * Clean up stale sessions from the database.
 * Removes sessions with no activity for > 1 minute.
 */
export async function cleanupStaleSessions() {
  try {
    const oneMinuteAgo = new Date(Date.now() - SESSION_CONFIG.STALE_THRESHOLD);

    const staleSessions = await db.query.sessions.findMany({
      where: lt(sessions.lastHeartbeat, oneMinuteAgo),
    });

    for (const session of staleSessions) {
      const sessionId = `${session.telegramId}:${session.chatId}`;
      await redis.sRem("active_sessions", sessionId);
    }

    if (staleSessions.length > 0) {
      await db.delete(sessions).where(lt(sessions.lastHeartbeat, oneMinuteAgo));

      console.log(`[Cleanup] Removed ${staleSessions.length} stale sessions`);
    }
  } catch (error) {
    console.error("[Cleanup] Error cleaning up stale sessions:", error);
  }
}

export function startBackgroundJobs() {
  setInterval(syncRedisToPostgres, SYNC_INTERVALS.REDIS_TO_DB);

  setInterval(cleanupStaleSessions, SYNC_INTERVALS.CLEANUP_SESSIONS);

  console.log("[Jobs] Background jobs started");
}
