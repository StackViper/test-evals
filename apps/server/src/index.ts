import { db } from "@test-evals/db";
import { runs } from "@test-evals/db";
import { auth } from "@test-evals/auth";
import { env } from "@test-evals/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { RunnerService } from "./services/runner.service";
import { desc, eq } from "drizzle-orm";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/", (c) => {
  return c.text("OK");
});

app.post("/api/v1/runs", async (c) => {
  const { strategy, model } = await c.req.json();
  const runner = new RunnerService(env.GEMINI_API_KEY);
  
  const runIdPromise = runner.startRun(strategy, model);
  
  return c.json({ id: await runIdPromise });
});

app.get("/api/v1/runs", async (c) => {
  const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt));
  return c.json(allRuns);
});

app.get("/api/v1/runs/:id", async (c) => {
  const id = c.req.param("id");
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, id),
  });
  
  if (!run) return c.json({ error: "Run not found" }, 404);
  
  const runResults = await db.query.results.findMany({
    where: (results, { eq }) => eq(results.runId, id)
  });
  
  return c.json({ ...run, results: runResults });
});

export default app;
