export interface User {
  telegramId: number;
  username: string;
}

export interface LeaderboardEntry {
  username: string;
  clicks: number;
}

export interface Stats {
  userStats: { username: string; clicks: number };
  globalStats: { totalClicks: number };
  leaderboard: LeaderboardEntry[];
}

export interface UserResponse {
  user?: User;
}

export interface CreateUserResponse {
  user: User;
}
