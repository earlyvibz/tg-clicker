CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"chat_id" bigint NOT NULL,
	"message_id" integer NOT NULL,
	"last_heartbeat" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"username" text NOT NULL,
	"total_clicks" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE INDEX "session_telegram_id_idx" ON "sessions" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "session_telegram_chat_idx" ON "sessions" USING btree ("telegram_id","chat_id");--> statement-breakpoint
CREATE INDEX "telegram_id_idx" ON "users" USING btree ("telegram_id");