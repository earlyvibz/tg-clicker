import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { DB_CONFIG } from "../src/constants";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://clickuser:clickpass@localhost:5432/clickdb";

const client = postgres(connectionString, {
  max: DB_CONFIG.MAX_CONNECTIONS,
  idle_timeout: DB_CONFIG.IDLE_TIMEOUT,
  connect_timeout: DB_CONFIG.CONNECT_TIMEOUT,
});

export const db = drizzle(client, { schema });
