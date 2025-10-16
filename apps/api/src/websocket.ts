import { createClient } from "redis";

const redisSubscriber = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisSubscriber.on("error", (err) =>
  console.error("[WS] Redis Subscriber Error", err)
);

export async function startWebSocketBroadcaster() {
  await redisSubscriber.connect();

  await redisSubscriber.pSubscribe("stats:user:*", (message, channel) => {
    try {
      const telegramId = channel.split(":")[2];
      const server = (globalThis as any).server;
      if (server) {
        server.publish(`stats-${telegramId}`, message);
      }
    } catch (error) {
      console.error("[WS] Error broadcasting stats:", error);
    }
  });

  console.log("[WS] WebSocket broadcaster started");
}
