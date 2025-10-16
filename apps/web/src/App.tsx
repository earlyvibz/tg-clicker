import "./index.css";
import { useEffect, useState } from "react";
import { ClickButton } from "./components/ClickButton";
import { useWebSocket } from "./hooks/useWebSocket";

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

export function App() {
  const [optimisticClicks, setOptimisticClicks] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>("");
  const [chatId, setChatId] = useState<number | null>(null);
  const API_URL = process.env.BUN_PUBLIC_API_URL;
  const { stats, connected } = useWebSocket(telegramId, API_URL as string);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      setIsReady(true);
      return;
    }

    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    if (tg.themeParams?.bg_color) {
      document.body.style.backgroundColor = tg.themeParams.bg_color;
    }

    if (tg.initDataUnsafe?.user) {
      setTelegramId(tg.initDataUnsafe.user.id);
      setUsername(
        tg.initDataUnsafe.user.username ||
          tg.initDataUnsafe.user.first_name ||
          "User"
      );
      setIsReady(true);
    } else if (process.env.NODE_ENV !== "production") {
      setTelegramId(999999999);
      setUsername("TestUser");
      setIsReady(true);
    }

    if (tg.initDataUnsafe?.chat) {
      setChatId(tg.initDataUnsafe.chat.id);
    }

    return () => {
      if (tg) {
        tg.disableClosingConfirmation();
      }
    };
  }, []);

  useEffect(() => {
    if (stats?.userStats?.clicks !== undefined) {
      setOptimisticClicks(stats.userStats.clicks);
    }
  }, [stats?.userStats?.clicks]);

  useEffect(() => {
    if (!telegramId || !chatId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_URL}/api/session/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId, chatId }),
        });
      } catch (error) {
        console.error("Heartbeat error:", error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    return () => clearInterval(interval);
  }, [telegramId, chatId]);

  const handleClickSuccess = (newCount: number) => {
    setOptimisticClicks(newCount);
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("light");
    }
  };

  if (!isReady || !telegramId) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "3px solid #f3f3f3",
              borderTop: "3px solid #3498db",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <p>Loading Mini App...</p>
        </div>
      </div>
    );
  }

  const handleReconnect = () => {
    setOptimisticClicks(0);
    window.location.reload();
  };

  return (
    <div className="app">
      <div
        className="connection-status"
        style={{
          backgroundColor: connected ? "#22c55e" : "#ef4444",
          animation: !connected ? "pulse 2s infinite" : "none",
        }}
      >
        {connected ? "● Live" : "● Reconnecting..."}
      </div>

      {!connected && (
        <div className="refresh-banner">
          <p>
            <strong>⚠️ Connection Lost</strong>
          </p>
          <p>Your clicks are saved. Reconnect to see live updates.</p>
          <button onClick={handleReconnect} className="reconnect-button">
            🔄 Reconnect Now
          </button>
        </div>
      )}

      <div className="header">
        <h1>🎮 Telegram Clicker</h1>
        <p className="username">@{username}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Your Clicks</div>
          <div className="stat-value">{optimisticClicks.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Global Clicks</div>
          <div className="stat-value">
            {stats?.globalStats?.totalClicks?.toLocaleString() || "0"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Players</div>
          <div className="stat-value">
            {stats?.globalStats?.totalUsers?.toLocaleString() || "0"}
          </div>
        </div>
      </div>

      <div className="click-area">
        <ClickButton
          onClickSuccess={handleClickSuccess}
          telegramId={telegramId}
          username={username}
          apiUrl={API_URL as string}
        />
        <div className="click-instruction">Tap to earn points!</div>
      </div>

      <div className="leaderboard">
        <h2>🏆 Top 20 Clickers</h2>
        <div className="leaderboard-list">
          {stats?.leaderboard && stats.leaderboard.length > 0 ? (
            stats.leaderboard.map((entry, idx) => (
              <div
                key={`${entry.username}-${idx}`}
                className="leaderboard-item"
              >
                <span className="rank">#{idx + 1}</span>
                <span className="username">{entry.username}</span>
                <span className="clicks">
                  {entry.clicks?.toLocaleString() || "0"}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-leaderboard">
              No players yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
