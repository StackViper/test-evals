import type { ClinicalExtraction } from "@test-evals/shared";

export interface PromptStrategy {
  name: string;
  getSystemPrompt(): string;
  getUserPrompt(transcript: string): string;
  getExamples?(): any[];
}

export interface ExtractionResult {
  data: ClinicalExtraction | null;
  rawResponse: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheRead: number;
    cacheWrite: number;
  };
  retries: number;
  error?: string;
}
