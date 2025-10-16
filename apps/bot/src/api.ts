import type { CreateUserResponse, UserResponse, Stats } from "./types";

const API_URL = process.env.API_URL;

export async function createOrGetUser(
  telegramId: number,
  username: string
): Promise<CreateUserResponse> {
  const response = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, username }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  return (await response.json()) as CreateUserResponse;
}

export async function getUser(
  telegramId: number
): Promise<UserResponse | null> {
  const response = await fetch(`${API_URL}/api/users/${telegramId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  return (await response.json()) as UserResponse;
}

export async function updateUsername(
  telegramId: number,
  newUsername: string
): Promise<CreateUserResponse> {
  const response = await fetch(`${API_URL}/api/users/${telegramId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: newUsername }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update username: ${response.statusText}`);
  }

  return (await response.json()) as CreateUserResponse;
}

export async function getStats(telegramId: number): Promise<Stats> {
  const response = await fetch(`${API_URL}/api/stats/${telegramId}`);

  if (!response.ok) {
    throw new Error(`Failed to get stats: ${response.statusText}`);
  }

  return (await response.json()) as Stats;
}

export async function startSession(
  telegramId: number,
  chatId: number,
  messageId: number
) {
  const response = await fetch(`${API_URL}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, chatId, messageId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.statusText}`);
  }

  return await response.json();
}

export async function endSession(telegramId: number, chatId: number) {
  const response = await fetch(`${API_URL}/api/session/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, chatId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to end session: ${response.statusText}`);
  }

  return await response.json();
}
