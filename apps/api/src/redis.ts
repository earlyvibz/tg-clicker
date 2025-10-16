import { createClient } from "redis";
import { BATCH_CONFIG, SESSION_CONFIG } from "./constants";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = createClient({
  url: redisUrl,
});

redis.on("error", (err: Error) => console.error("Redis Client Error", err));

await redis.connect();

export async function incrementUserClicks(
  telegramId: number,
  username: string
): Promise<number> {
  const userKey = `user:${telegramId}`;

  const script = `
    local userKey = KEYS[1]
    local leaderboardKey = KEYS[2]
    local globalKey = KEYS[3]
    local telegramId = ARGV[1]
    local username = ARGV[2]
    
    redis.call('HSET', userKey, 'username', username)
    local newClicks = redis.call('HINCRBY', userKey, 'clicks', 1)
    redis.call('ZADD', leaderboardKey, newClicks, telegramId)
    redis.call('HINCRBY', globalKey, 'total_clicks', 1)
    
    return newClicks
  `;

  const result = await redis.eval(script, {
    keys: [userKey, "leaderboard", "global:stats"],
    arguments: [telegramId.toString(), username],
  });

  return result as number;
}

export async function getUserStats(telegramId: number) {
  const userKey = `user:${telegramId}`;
  const data = await redis.hGetAll(userKey);

  if (!data.username) return null;

  return {
    username: data.username,
    clicks: parseInt(data.clicks || "0"),
  };
}

export async function getGlobalStats() {
  const data = await redis.hGetAll("global:stats");
  return {
    totalClicks: parseInt(data.total_clicks || "0"),
    totalUsers: parseInt(data.total_users || "0"),
  };
}

export async function getLeaderboard(
  limit: number = BATCH_CONFIG.TOP_LEADERBOARD_DISPLAY
) {
  const results = await redis.zRangeWithScores("leaderboard", 0, limit - 1, {
    REV: true,
  });

  const leaderboard = await Promise.all(
    results.map(async (entry: { value: string; score: number }) => {
      const telegramId = entry.value;
      const clicks = entry.score;
      const userKey = `user:${telegramId}`;
      const username = await redis.hGet(userKey, "username");

      return {
        telegramId: parseInt(telegramId),
        username: username || "Unknown",
        clicks,
      };
    })
  );

  return leaderboard;
}

export async function setUserData(
  telegramId: number,
  username: string,
  clicks: number = 0
) {
  const userKey = `user:${telegramId}`;
  await redis.hSet(userKey, {
    username,
    clicks: clicks.toString(),
  });

  if (clicks > 0) {
    await redis.zAdd("leaderboard", {
      score: clicks,
      value: telegramId.toString(),
    });
  }

  await redis.hIncrBy("global:stats", "total_users", 1);
}

export async function updateUsername(telegramId: number, newUsername: string) {
  const userKey = `user:${telegramId}`;
  await redis.hSet(userKey, "username", newUsername);
}

export async function checkRateLimit(
  telegramId: number,
  maxPerSecond: number = 20
): Promise<boolean> {
  const key = `rate_limit:${telegramId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 1);
  }

  return current <= maxPerSecond;
}

export async function addActiveSession(sessionId: string) {
  await redis.sAdd("active_sessions", sessionId);
}

export async function removeActiveSession(sessionId: string) {
  await redis.sRem("active_sessions", sessionId);
}

export async function getActiveSessions(): Promise<string[]> {
  return await redis.sMembers("active_sessions");
}

export async function getActiveSessionCount(): Promise<number> {
  return await redis.sCard("active_sessions");
}

export async function getAllStatsPipelined(telegramId: number) {
  const userKey = `user:${telegramId}`;

  const pipeline = redis.multi();
  pipeline.hGetAll(userKey);
  pipeline.hGetAll("global:stats");

  const [userData, globalData] = (await pipeline.exec()) as [
    Record<string, string> | null,
    Record<string, string> | null
  ];

  const userStats = userData?.username
    ? {
        username: userData.username,
        clicks: parseInt(userData.clicks || "0"),
      }
    : null;

  const globalStats = {
    totalClicks: parseInt(globalData?.total_clicks || "0"),
    totalUsers: parseInt(globalData?.total_users || "0"),
  };

  const leaderboard = await getLeaderboard(
    BATCH_CONFIG.TOP_LEADERBOARD_DISPLAY
  );

  return { userStats, globalStats, leaderboard };
}

export async function publishClickEvent(telegramId: number) {
  try {
    const sessionKeys = await redis.keys(`session:${telegramId}:*`);

    if (sessionKeys.length === 0) return;

    for (const key of sessionKeys) {
      const sessionData = await redis.hGetAll(key);

      if (!sessionData.chatId || !sessionData.messageId) continue;

      const event = {
        telegramId,
        chatId: parseInt(sessionData.chatId),
        messageId: parseInt(sessionData.messageId),
        timestamp: Date.now(),
      };

      await redis.publish("click:updates", JSON.stringify(event));
    }
  } catch (error) {
    console.error("[Redis] Failed to publish click event:", error);
  }
}

export async function updateSessionClickTime(
  telegramId: number,
  chatId: number
) {
  const sessionId = `${telegramId}:${chatId}`;
  const now = Date.now();

  await redis.hSet(`session:${sessionId}`, "lastClickTime", now.toString());
  await redis.expire(`session:${sessionId}`, SESSION_CONFIG.REDIS_TTL);
}

export async function updateSessionHeartbeat(
  telegramId: number,
  chatId: number
) {
  const sessionId = `${telegramId}:${chatId}`;
  const now = Date.now();

  await redis.hSet(`session:${sessionId}`, "lastHeartbeat", now.toString());
  await redis.expire(`session:${sessionId}`, SESSION_CONFIG.REDIS_TTL);
}

export async function publishStatsUpdate(telegramId: number) {
  try {
    const userInfo = await getUserStats(telegramId);
    if (!userInfo) return;

    const globalStats = await getGlobalStats();
    const leaderboard = await getLeaderboard();

    const stats = {
      userStats: userInfo,
      globalStats,
      leaderboard,
    };

    await redis.publish(`stats:user:${telegramId}`, JSON.stringify(stats));
    await redis.publish("stats:global", JSON.stringify(globalStats));
  } catch (error) {
    console.error("[Redis] Failed to publish stats update:", error);
  }
}

console.log("Redis connected successfully");
