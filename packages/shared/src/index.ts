export * from "./schema";

export type RunStatus = "idle" | "running" | "completed" | "failed";

export interface RunSummary {
  id: string;
  strategy: string;
  model: string;
  status: RunStatus;
  aggregateF1: number;
  totalCost: number;
  durationMs: number;
  createdAt: string;
  promptHash: string;
}

export interface CaseResult {
  id: string;
  runId: string;
  transcriptId: string;
  prediction: any;
  gold: any;
  scores: Record<string, number>;
  isSchemaValid: boolean;
  isHallucinated: boolean;
  latencyMs: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  retries: number;
}
