import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategy: text("strategy").notNull(), // zero_shot, few_shot, cot
  model: text("model").notNull(),
  status: text("status").notNull().default("idle"), // idle, running, completed, failed
  promptHash: text("prompt_hash").notNull(),
  aggregateF1: real("aggregate_f1").notNull().default(0),
  totalCost: numeric("total_cost", { precision: 10, scale: 6 }).notNull().default("0"),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const results = pgTable("results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  transcriptId: text("transcript_id").notNull(),
  prediction: jsonb("prediction"),
  gold: jsonb("gold").notNull(),
  scores: jsonb("scores").notNull(), // { chief_complaint: 0.9, vitals: 1.0, ... }
  isSchemaValid: boolean("is_schema_valid").notNull().default(true),
  isHallucinated: boolean("is_hallucinated").notNull().default(false),
  latencyMs: integer("latency_ms").notNull().default(0),
  tokensInput: integer("tokens_input").notNull().default(0),
  tokensOutput: integer("tokens_output").notNull().default(0),
  tokensCacheRead: integer("tokens_cache_read").notNull().default(0),
  tokensCacheWrite: integer("tokens_cache_write").notNull().default(0),
  retries: integer("retries").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
