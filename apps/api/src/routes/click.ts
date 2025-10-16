import { Hono } from "hono";
import {
  incrementUserClicks,
  checkRateLimit,
  publishClickEvent,
  publishStatsUpdate,
} from "../redis";
import { validateTelegramId, validateUsername } from "../utils/validation";
import { RATE_LIMITS } from "../constants";

const app = new Hono();

app.post("/", async (c) => {
  const { telegramId, username } = await c.req.json();

  const telegramIdValidation = validateTelegramId(telegramId);
  const usernameValidation = validateUsername(username);

  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  if (!usernameValidation.valid) {
    return c.json({ error: usernameValidation.error }, 400);
  }

  const validTelegramId = telegramIdValidation.value!;

  const allowed = await checkRateLimit(
    validTelegramId,
    RATE_LIMITS.CLICKS_PER_SECOND
  );

  if (!allowed) {
    return c.json(
      {
        error: `Rate limit exceeded. Max ${RATE_LIMITS.CLICKS_PER_SECOND} clicks per second.`,
      },
      429
    );
  }

  const newClickCount = await incrementUserClicks(validTelegramId, username);

  await publishClickEvent(validTelegramId);
  await publishStatsUpdate(validTelegramId);

  return c.json({
    success: true,
    clicks: newClickCount,
  });
});

export default app;
