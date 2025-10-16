import { Hono } from "hono";
import { db } from "../../db/db";
import { sessions } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import {
  addActiveSession,
  removeActiveSession,
  updateSessionHeartbeat,
} from "../redis";
import { createSessionId, validateTelegramId } from "../utils/validation";

const app = new Hono();

app.post("/start", async (c) => {
  const { telegramId, chatId, messageId } = await c.req.json();

  const telegramIdValidation = validateTelegramId(telegramId);
  const chatIdValidation = validateTelegramId(chatId);

  if (!telegramIdValidation.valid) {
    return c.json({ error: telegramIdValidation.error }, 400);
  }

  if (!chatIdValidation.valid) {
    return c.json({ error: "Invalid chatId" }, 400);
  }

  if (!messageId) {
    return c.json({ error: "messageId is required" }, 400);
  }

  const validTelegramId = telegramIdValidation.value!;
  const validChatId = chatIdValidation.value!;
  const sessionId = createSessionId(validTelegramId, validChatId);

  const existingSession = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.telegramId, validTelegramId),
      eq(sessions.chatId, validChatId)
    ),
  });

  if (existingSession) {
    await db
      .update(sessions)
      .set({
        messageId,
        lastHeartbeat: new Date(),
      })
      .where(eq(sessions.id, existingSession.id));

    await addActiveSession(sessionId);

    return c.json({
      session: { ...existingSession, messageId },
      reactivated: true,
    });
  }

  const [newSession] = await db
    .insert(sessions)
    .values({
      telegramId: validTelegramId,
      chatId: validChatId,
      messageId,
    })
    .returning();

  await addActiveSession(sessionId);

  return c.json({ session: newSession, reactivated: false }, 201);
});

app.post("/end", async (c) => {
  const { telegramId, chatId } = await c.req.json();

  const telegramIdValidation = validateTelegramId(telegramId);
  const chatIdValidation = validateTelegramId(chatId);

  if (!telegramIdValidation.valid || !chatIdValidation.valid) {
    return c.json({ error: "Invalid telegramId or chatId" }, 400);
  }

  const sessionId = createSessionId(
    telegramIdValidation.value!,
    chatIdValidation.value!
  );
  await removeActiveSession(sessionId);

  return c.json({ success: true });
});

app.post("/heartbeat", async (c) => {
  const { telegramId, chatId } = await c.req.json();

  const telegramIdValidation = validateTelegramId(telegramId);
  const chatIdValidation = validateTelegramId(chatId);

  if (!telegramIdValidation.valid || !chatIdValidation.valid) {
    return c.json({ error: "Invalid telegramId or chatId" }, 400);
  }

  const validTelegramId = telegramIdValidation.value!;
  const validChatId = chatIdValidation.value!;

  await db
    .update(sessions)
    .set({ lastHeartbeat: new Date() })
    .where(
      and(
        eq(sessions.telegramId, validTelegramId),
        eq(sessions.chatId, validChatId)
      )
    );

  const sessionId = createSessionId(validTelegramId, validChatId);
  await addActiveSession(sessionId);
  await updateSessionHeartbeat(validTelegramId, validChatId);

  return c.json({ success: true });
});

app.get("/active", async (c) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const activeSessions = await db.query.sessions.findMany({
    where: (sessions, { gte }) => gte(sessions.lastHeartbeat, oneMinuteAgo),
  });

  return c.json({ sessions: activeSessions });
});

export default app;
