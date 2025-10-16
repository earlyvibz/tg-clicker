import { USERNAME_VALIDATION } from "./constants";

export function formatWelcomeMessage(
  username: string,
  userClicks: number,
  globalClicks: number,
  leaderboard: Array<{ username: string; clicks: number }>
) {
  let message = `👋 <b>Welcome, ${username}!</b>\n\n`;
  message += `🖱 Your clicks: <b>${userClicks.toLocaleString()}</b>\n`;
  message += `🌍 Total clicks: <b>${globalClicks.toLocaleString()}</b>\n\n`;
  message += `🏆 <b>Top 20 Clickers:</b>\n`;

  if (leaderboard.length === 0) {
    message += `<i>No data yet...</i>`;
  } else {
    leaderboard.slice(0, 20).forEach((entry, idx) => {
      const medal =
        idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
      message += `${medal} ${
        entry.username
      }: ${entry.clicks.toLocaleString()}\n`;
    });
  }

  return message;
}

export function validateUsername(username: string): boolean {
  return (
    username.length >= USERNAME_VALIDATION.MIN_LENGTH &&
    username.length <= USERNAME_VALIDATION.MAX_LENGTH &&
    USERNAME_VALIDATION.PATTERN.test(username)
  );
}
