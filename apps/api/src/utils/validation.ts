const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      error: "Username must be alphanumeric (letters, numbers, underscore)",
    };
  }

  return { valid: true };
}

export function validateTelegramId(telegramId: unknown): {
  valid: boolean;
  value?: number;
  error?: string;
} {
  const id = typeof telegramId === "string" ? parseInt(telegramId) : telegramId;

  if (typeof id !== "number" || Number.isNaN(id)) {
    return { valid: false, error: "Invalid telegramId" };
  }

  return { valid: true, value: id as number };
}

export function createSessionId(telegramId: number, chatId: number): string {
  return `${telegramId}:${chatId}`;
}
