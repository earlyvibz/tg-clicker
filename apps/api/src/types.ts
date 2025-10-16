export interface User {
  id: number;
  telegramId: number;
  username: string;
  totalClicks: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: number;
  telegramId: number;
  chatId: number;
  messageId: number;
  lastHeartbeat: Date;
  createdAt: Date;
}

export interface LeaderboardEntry {
  telegramId: number;
  username: string;
  clicks: number;
}

export interface UserStats {
  username: string;
  clicks: number;
}

export interface GlobalStats {
  totalClicks: number;
  totalUsers: number;
}

export interface StatsResponse {
  userStats: UserStats | null;
  globalStats: GlobalStats;
  leaderboard: LeaderboardEntry[];
}

