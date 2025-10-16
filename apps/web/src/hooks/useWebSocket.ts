import { useEffect, useState, useRef } from "react";

interface Stats {
  userStats: { username: string; clicks: number };
  globalStats: { totalClicks: number; totalUsers: number };
  leaderboard: Array<{ username: string; clicks: number }>;
}

export function useWebSocket(telegramId: number | null, apiUrl: string) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!telegramId) return;

    const wsUrl =
      apiUrl.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected");
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", telegramId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStats(data);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        setConnected(false);
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected, reconnecting in 3s...");
        setConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    };

    const fetchInitialStats = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/stats/${telegramId}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("[WS] Error fetching initial stats:", error);
      }
    };

    fetchInitialStats();
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [telegramId, apiUrl]);

  return { stats, connected };
}
