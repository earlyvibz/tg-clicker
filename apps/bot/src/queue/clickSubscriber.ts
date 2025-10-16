import Redis from "ioredis";
import { enqueueUpdate, Priority } from "./updateQueue";

const redisSubscriber = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

interface ClickEvent {
  telegramId: number;
  chatId: number;
  messageId: number;
  timestamp: number;
}

export function startClickSubscriber() {
  redisSubscriber.subscribe("click:updates");

  redisSubscriber.on("subscribe", (channel: string, count: number) => {
    console.log(`[Subscriber] Subscribed to ${channel} (${count} channels)`);
  });

  redisSubscriber.on("message", async (channel: string, message: string) => {
    if (channel !== "click:updates") return;

    try {
      const event: ClickEvent = JSON.parse(message);

      await enqueueUpdate(
        {
          telegramId: event.telegramId,
          chatId: event.chatId,
          messageId: event.messageId,
          lastClickTime: event.timestamp,
          lastHeartbeat: event.timestamp,
        },
        Priority.HIGH
      );

      console.log(
        `[Subscriber] Enqueued HIGH priority update for user ${event.telegramId}`
      );
    } catch (error) {
      console.error("[Subscriber] Error processing click event:", error);
    }
  });

  console.log("[Subscriber] Click subscriber started");
}
