import { Hono } from "hono";
import { cors } from "hono/cors";
import usersRouter from "./routes/users";
import clickRouter from "./routes/click";
import statsRouter from "./routes/stats";
import sessionRouter from "./routes/session";
import { startBackgroundJobs } from "./jobs/syncRedisToDb";
import { startWebSocketBroadcaster } from "./websocket";
import "./redis";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => {
  return c.json({ status: "ok", message: "Click API is running" });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

app.route("/api/users", usersRouter);
app.route("/api/click", clickRouter);
app.route("/api/stats", statsRouter);
app.route("/api/session", sessionRouter);

startBackgroundJobs();
startWebSocketBroadcaster();

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      console.log("[WS] Upgrade attempt from:", req.headers.get("origin"));
      console.log("[WS] Upgrade header:", req.headers.get("upgrade"));
      console.log("[WS] Connection header:", req.headers.get("connection"));

      const success = server.upgrade(req, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });

      if (success) {
        console.log("[WS] Upgrade successful");
        return undefined;
      }

      console.log("[WS] Upgrade failed, returning 426");
      return new Response("Upgrade Required", {
        status: 426,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      console.log("[WS] Client connected");
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        if (data.type === "subscribe" && data.telegramId) {
          ws.subscribe(`stats-${data.telegramId}`);
          console.log(`[WS] User ${data.telegramId} subscribed`);
        }
      } catch (error) {
        console.error("[WS] Error handling message:", error);
      }
    },
    close() {
      console.log("[WS] Client disconnected");
    },
  },
});

(globalThis as any).server = server;

console.log(`Server running on http://localhost:${port}`);
console.log(`WebSocket ready at ws://localhost:${port}/ws`);
