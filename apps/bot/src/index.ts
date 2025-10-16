import { Telegraf, Markup, type Context } from "telegraf";
import {
  createOrGetUser,
  getUser,
  updateUsername,
  getStats,
  startSession,
} from "./api";
import { formatWelcomeMessage, validateUsername } from "./utils";
import { registerSession, startSessionSync } from "./messageUpdater";
import type { User } from "./types";
import { createUpdateWorker } from "./queue/updateWorker";
import { startClickSubscriber } from "./queue/clickSubscriber";
import { startMetricsReporting } from "./queue/metrics";
import { MESSAGES } from "./constants";

interface MyContext extends Context {}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN as string);

const MINI_APP_URL = process.env.MINI_APP_URL as string;

bot.command("start", async (ctx) => {
  const telegramId = ctx.from.id;

  try {
    const userData = await getUser(telegramId);

    if (!userData || !userData.user) {
      await ctx.reply(MESSAGES.WELCOME, Markup.forceReply());
      return;
    }

    await showWelcomeMessage(ctx, userData.user);
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply(MESSAGES.ERROR_GENERIC);
  }
});

bot.command("changename", async (ctx) => {
  await ctx.reply(MESSAGES.CHANGE_USERNAME_PROMPT, Markup.forceReply());
});

bot.on("text", async (ctx) => {
  if (ctx.message.reply_to_message) {
    const replyText = (ctx.message.reply_to_message as { text?: string }).text;
    const username = ctx.message.text.trim();

    if (
      replyText?.includes("set your username") ||
      replyText?.includes("new username")
    ) {
      if (!validateUsername(username)) {
        await ctx.reply(MESSAGES.USERNAME_INVALID);
        return;
      }

      const telegramId = ctx.from.id;

      try {
        if (replyText?.includes("set your username")) {
          const result = await createOrGetUser(telegramId, username);
          await ctx.reply(MESSAGES.USERNAME_SET(username));
          await showWelcomeMessage(ctx, result.user);
        } else {
          const result = await updateUsername(telegramId, username);
          await ctx.reply(MESSAGES.USERNAME_UPDATED(username));
          await showWelcomeMessage(ctx, result.user);
        }
      } catch (error) {
        console.error("Error setting username:", error);
        await ctx.reply(MESSAGES.ERROR_USERNAME);
      }
    }
  }
});

async function showWelcomeMessage(ctx: MyContext, user: Partial<User>) {
  try {
    const telegramId = user.telegramId ?? ctx.from?.id;
    if (!telegramId) return;
    const stats = await getStats(telegramId);

    const message = formatWelcomeMessage(
      stats.userStats.username,
      stats.userStats.clicks,
      stats.globalStats.totalClicks,
      stats.leaderboard
    );

    const sentMessage = await ctx.reply(message, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🎮 Play Game", MINI_APP_URL)],
        [Markup.button.callback("📝 Change Username", "change_username")],
      ]),
    });

    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const messageId = sentMessage.message_id;

    await startSession(telegramId, chatId, messageId);
    registerSession(telegramId, chatId, messageId);
  } catch (error) {
    console.error("Error showing welcome message:", error);
    await ctx.reply(MESSAGES.ERROR_STATS);
  }
}

bot.action("change_username", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(MESSAGES.CHANGE_USERNAME_PROMPT, Markup.forceReply());
});

bot.launch();

const worker = createUpdateWorker(bot);
startClickSubscriber();
startSessionSync();
startMetricsReporting();

console.log("Bot is running with queue-based updates...");

process.once("SIGINT", async () => {
  console.log("Shutting down...");
  await worker.close();
  bot.stop("SIGINT");
});
process.once("SIGTERM", async () => {
  console.log("Shutting down...");
  await worker.close();
  bot.stop("SIGTERM");
});
