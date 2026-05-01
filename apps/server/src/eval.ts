import { RunnerService } from "./services/runner.service";
import { env } from "@test-evals/env/server";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    strategy: { type: "string", default: "zero_shot" },
    model: { type: "string", default: "gemini-flash-latest" },
  },
  strict: true,
});

const runner = new RunnerService(env.GEMINI_API_KEY);

console.log(`🚀 Starting Evaluation Run...`);
console.log(`Strategy: ${values.strategy}`);
console.log(`Model: ${values.model}`);

const runId = await runner.startRun(values.strategy!, values.model!, (progress) => {
  if (progress.type === "case_completed") {
    console.log(`[${progress.progress}%] Completed ${progress.transcriptId}`);
  }
});

console.log(`\n✅ Evaluation Complete!`);
console.log(`Run ID: ${runId}`);
console.log(`View results in the dashboard at http://localhost:3001/dashboard`);
process.exit(0);
