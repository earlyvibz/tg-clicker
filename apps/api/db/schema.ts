import {
  pgTable,
  serial,
  bigint,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull().unique(),
    username: text("username").notNull(),
    totalClicks: bigint("total_clicks", { mode: "number" })
      .default(0)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    telegramIdIdx: index("telegram_id_idx").on(table.telegramId),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
    chatId: bigint("chat_id", { mode: "number" }).notNull(),
    messageId: integer("message_id").notNull(),
    lastHeartbeat: timestamp("last_heartbeat").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    telegramIdIdx: index("session_telegram_id_idx").on(table.telegramId),
    compositeIdx: index("session_telegram_chat_idx").on(
      table.telegramId,
      table.chatId
    ),
  })
);
