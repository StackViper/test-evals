import { db } from "@test-evals/db";
import { results, runs } from "@test-evals/db";
import { Extractor, ZeroShotStrategy, FewShotStrategy, ChainOfThoughtStrategy } from "@test-evals/llm";
import { eq, and, desc } from "drizzle-orm";
import { EvaluateService } from "./evaluate.service";
import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";

export class RunnerService {
  private extractor: Extractor;
  private evaluator: EvaluateService;

  constructor(anthropicKey: string) {
    this.extractor = new Extractor(anthropicKey);
    this.evaluator = new EvaluateService();
  }

  async startRun(strategyName: string, model: string, onProgress?: (data: any) => void) {
    const strategy = this.getStrategy(strategyName);
    const promptHash = createHash("sha256")
      .update(strategy.getSystemPrompt() + strategy.getUserPrompt(""))
      .digest("hex");

    // 1. Create Run Record
    const [run] = await db
      .insert(runs)
      .values({
        strategy: strategyName,
        model,
        promptHash,
        status: "running",
      })
      .returning();

    // 2. Load Dataset
    const datasetPath = path.join(process.cwd(), "data");
    const transcriptFiles = (await fs.readdir(path.join(datasetPath, "transcripts"))).filter(f => f.endsWith(".txt"));

    const startTime = Date.now();
    let totalCost = 0;
    let successfulCases = 0;

    // 3. Semaphore for Concurrency (High Limit for Paid Tier)
    const limit = 10;
    const active = new Set<Promise<void>>();
    const queue = [...transcriptFiles];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const file = queue.shift()!;
      const transcriptId = file.replace(".txt", "");

      const promise = (async () => {
        try {
          // Resumability check: Skip if this transcript already has a result in this run
          const existing = await db.query.results.findFirst({
            where: and(
              eq(results.runId, run.id),
              eq(results.transcriptId, transcriptId)
            )
          });
          if (existing) {
            successfulCases++;
            return;
          }

          const transcript = await fs.readFile(path.join(datasetPath, "transcripts", file), "utf-8");
          const goldJson = JSON.parse(await fs.readFile(path.join(datasetPath, "gold", `${transcriptId}.json`), "utf-8"));

          const result = await this.extractor.extract(transcript, strategy, model);
          
          let caseResult;
          if (result.data) {
            const evaluation = this.evaluator.evaluateCase(result.data, goldJson, transcript);
            caseResult = {
              runId: run.id,
              transcriptId,
              prediction: result.data,
              gold: goldJson,
              scores: evaluation.scores,
              isHallucinated: evaluation.isHallucinated,
              latencyMs: 0,
              tokensInput: result.usage.inputTokens,
              tokensOutput: result.usage.outputTokens,
              tokensCacheRead: result.usage.cacheRead,
              tokensCacheWrite: result.usage.cacheWrite,
              retries: result.retries,
            };
          } else {
            caseResult = {
              runId: run.id,
              transcriptId,
              gold: goldJson,
              scores: {},
              isSchemaValid: false,
              tokensInput: result.usage.inputTokens,
              tokensOutput: result.usage.outputTokens,
              tokensCacheRead: result.usage.cacheRead,
              tokensCacheWrite: result.usage.cacheWrite,
            };
          }

          const [savedResult] = await db.insert(results).values(caseResult as any).returning();
          successfulCases++;

          const cost = (result.usage.inputTokens * 0.00025 / 1000) + (result.usage.outputTokens * 0.00125 / 1000);
          totalCost += cost;

          if (onProgress) {
            onProgress({
              type: "case_completed",
              runId: run.id,
              transcriptId,
              result: savedResult,
              progress: Math.round((successfulCases / transcriptFiles.length) * 100),
            });
          }
        } catch (err) {
          console.error(`Error processing ${transcriptId}:`, err);
        }
      })();

      active.add(promise);
      promise.finally(() => {
        active.delete(promise);
      });

      if (active.size < limit) {
        await processNext();
      } else {
        await Promise.race(active);
        await processNext();
      }
    };

    // To respect Gemini Free Tier 15 RPM limits
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const processWithDelay = async () => {
      while (queue.length > 0) {
        await processNext();
      }
    };

    await processWithDelay();
    await Promise.all(active);

    const allResults = await db.select().from(results).where(eq(results.runId, run.id));
    const avgF1 = allResults.length > 0 
      ? allResults.reduce((sum, r) => {
          const vals = Object.values(r.scores as Record<string, number>);
          return sum + (vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
        }, 0) / allResults.length
      : 0;

    await db.update(runs)
      .set({
        status: "completed",
        aggregateF1: avgF1,
        totalCost: totalCost.toFixed(6),
        durationMs: Date.now() - startTime,
        updatedAt: new Date(),
      })
      .where(eq(runs.id, run.id));

    return run.id;
  }

  private getStrategy(name: string): any {
    if (name === "zero_shot") return new ZeroShotStrategy();
    if (name === "few_shot") return new FewShotStrategy();
    if (name === "cot") return new ChainOfThoughtStrategy();
    throw new Error(`Unknown strategy: ${name}`);
  }
}
