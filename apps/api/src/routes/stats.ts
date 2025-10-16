import { Hono } from "hono";
import { getAllStatsPipelined } from "../redis";
import { db } from "../../db/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { validateTelegramId } from "../utils/validation";
import type { StatsResponse } from "../types";

const app = new Hono();

const statsCache = new Map<
  number,
  {
    data: StatsResponse;
    timestamp: number;
  }
>();
const CACHE_TTL = 500;

app.get("/:telegramId", async (c) => {
  const telegramIdValidation = validateTelegramId(c.req.param("telegramId"));

  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  const telegramId = telegramIdValidation.value!;

  const now = Date.now();
  const cached = statsCache.get(telegramId);

  if (!cached || now - cached.timestamp > CACHE_TTL) {
    const { userStats, globalStats, leaderboard } = await getAllStatsPipelined(
      telegramId
    );

    if (!userStats) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.telegramId, telegramId),
      });

      if (!dbUser) {
        return c.json({ error: "User not found" }, 404);
      }

      const data: StatsResponse = {
        userStats: {
          username: dbUser.username,
          clicks: Number(dbUser.totalClicks),
        },
        globalStats,
        leaderboard,
      };

      statsCache.set(telegramId, { data, timestamp: now });
      return c.json(data);
    }

    const data: StatsResponse = {
      userStats,
      globalStats,
      leaderboard,
    };

    statsCache.set(telegramId, { data, timestamp: now });
    return c.json(data);
  }

  return c.json(cached.data);
});

export default app;
