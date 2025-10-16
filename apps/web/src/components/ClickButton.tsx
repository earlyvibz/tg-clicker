import { useState } from "react";

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    };
  }
}

interface ClickButtonProps {
  onClickSuccess: (newCount: number) => void;
  telegramId: number;
  username: string;
  apiUrl: string;
  disabled?: boolean;
}

export function ClickButton({
  onClickSuccess,
  telegramId,
  username,
  apiUrl,
  disabled,
}: ClickButtonProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [pendingClicks, setPendingClicks] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  const handleClick = async () => {
    if (disabled) return;

    const now = Date.now();
    if (now - lastClickTime < 100) {
      return;
    }

    setLastClickTime(now);
    setIsAnimating(true);
    setPendingClicks((prev) => prev + 1);

    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("light");
    }

    setTimeout(() => setIsAnimating(false), 200);

    try {
      const response = await fetch(`${apiUrl}/api/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId, username }),
      });

      if (response.ok) {
        const data = await response.json();
        onClickSuccess(data.clicks);
        setPendingClicks((prev) => Math.max(0, prev - 1));
      } else {
        setPendingClicks((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Click error:", error);
      setPendingClicks((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`click-button ${isAnimating ? "animate" : ""}`}
        style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          fontSize: "48px",
          border: "4px solid var(--tg-theme-button-color, #0088cc)",
          background: "var(--tg-theme-button-color, #0088cc)",
          color: "var(--tg-theme-button-text-color, white)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "transform 0.1s, box-shadow 0.1s",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        🖱️
      </button>
      {pendingClicks > 0 && (
        <div
          style={{
            position: "absolute",
            top: "-10px",
            right: "-10px",
            background: "#ff4444",
            color: "white",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {pendingClicks}
        </div>
      )}
    </div>
  );
}
