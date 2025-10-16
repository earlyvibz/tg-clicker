import { Hono } from "hono";
import { db } from "../../db/db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { setUserData, updateUsername as redisUpdateUsername } from "../redis";
import { validateUsername, validateTelegramId } from "../utils/validation";

const app = new Hono();

app.post("/", async (c) => {
  const { telegramId, username } = await c.req.json();

  const telegramIdValidation = validateTelegramId(telegramId);
  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return c.json({ error: usernameValidation.error }, 400);
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramIdValidation.value!),
  });

  if (existingUser) {
    return c.json({ user: existingUser, created: false });
  }

  const [newUser] = await db
    .insert(users)
    .values({
      telegramId: telegramIdValidation.value!,
      username,
      totalClicks: 0,
    })
    .returning();

  await setUserData(telegramIdValidation.value!, username, 0);

  return c.json({ user: newUser, created: true }, 201);
});

app.get("/:telegramId", async (c) => {
  const telegramIdValidation = validateTelegramId(c.req.param("telegramId"));

  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramIdValidation.value!),
  });

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});

app.patch("/:telegramId", async (c) => {
  const telegramIdValidation = validateTelegramId(c.req.param("telegramId"));
  const { username } = await c.req.json();

  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return c.json({ error: usernameValidation.error }, 400);
  }

  const [updatedUser] = await db
    .update(users)
    .set({ username, updatedAt: new Date() })
    .where(eq(users.telegramId, telegramIdValidation.value!))
    .returning();

  if (!updatedUser) {
    return c.json({ error: "User not found" }, 404);
  }

  await redisUpdateUsername(telegramIdValidation.value!, username);

  return c.json({ user: updatedUser });
});

export default app;
