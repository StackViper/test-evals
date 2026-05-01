import * as fuzzball from "fuzzball";
import type { ClinicalExtraction, Medication, Diagnosis } from "@test-evals/shared";

export class EvaluateService {
  /**
   * Main evaluation entry point
   */
  evaluateCase(prediction: ClinicalExtraction, gold: ClinicalExtraction, transcript: string) {
    const scores: Record<string, number> = {
      chief_complaint: this.scoreChiefComplaint(prediction.chief_complaint, gold.chief_complaint),
      vitals: this.scoreVitals(prediction.vitals, gold.vitals),
      medications: this.scoreMedications(prediction.medications, gold.medications),
      diagnoses: this.scoreDiagnoses(prediction.diagnoses, gold.diagnoses),
      plan: this.scoreSet(prediction.plan, gold.plan),
      follow_up: this.scoreFollowUp(prediction.follow_up, gold.follow_up),
    };

    const isHallucinated = this.detectHallucinations(prediction, transcript);

    return {
      scores,
      isHallucinated,
      aggregateF1: Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
    };
  }

  private scoreChiefComplaint(pred: string, gold: string): number {
    return fuzzball.token_set_ratio(pred.toLowerCase(), gold.toLowerCase()) / 100;
  }

  private scoreVitals(pred: any, gold: any): number {
    const fields = ["bp", "hr", "temp_f", "spo2"];
    let correct = 0;

    for (const field of fields) {
      const p = pred[field];
      const g = gold[field];

      if (g === null) {
        if (p === null) correct++;
        continue;
      }

      if (typeof g === "number" && typeof p === "number") {
        // Tolerance for numeric fields (e.g. temp_f ±0.2)
        const tolerance = field === "temp_f" ? 0.2 : 0;
        if (Math.abs(p - g) <= tolerance) correct++;
      } else if (p === g) {
        correct++;
      }
    }

    return correct / fields.length;
  }

  private scoreMedications(pred: Medication[], gold: Medication[]): number {
    return this.computeSetF1(
      pred,
      gold,
      (p, g) => {
        const nameMatch = fuzzball.token_set_ratio(p.name, g.name) > 85;
        const doseMatch = this.normalizeMed(p.dose) === this.normalizeMed(g.dose);
        const freqMatch = this.normalizeMed(p.frequency) === this.normalizeMed(g.frequency);
        return nameMatch && doseMatch && freqMatch;
      }
    );
  }

  private scoreDiagnoses(pred: Diagnosis[], gold: Diagnosis[]): number {
    return this.computeSetF1(
      pred,
      gold,
      (p, g) => {
        const descMatch = fuzzball.token_set_ratio(p.description, g.description) > 85;
        const icdMatch = p.icd10 === g.icd10;
        return descMatch && icdMatch;
      }
    );
  }

  private scoreSet(pred: string[], gold: string[]): number {
    return this.computeSetF1(
      pred,
      gold,
      (p, g) => fuzzball.token_set_ratio(p, g) > 85
    );
  }

  private scoreFollowUp(pred: any, gold: any): number {
    const intervalMatch = pred.interval_days === gold.interval_days ? 1 : 0;
    const reasonMatch = fuzzball.token_set_ratio(pred.reason || "", gold.reason || "") / 100;
    return (intervalMatch + reasonMatch) / 2;
  }

  private computeSetF1<T>(
    preds: T[],
    golds: T[],
    matchFn: (p: T, g: T) => boolean
  ): number {
    if (golds.length === 0) return preds.length === 0 ? 1 : 0;
    if (preds.length === 0) return 0;

    let truePositives = 0;
    const matchedGold = new Set<number>();

    for (const p of preds) {
      for (let i = 0; i < golds.length; i++) {
        if (!matchedGold.has(i) && matchFn(p, golds[i])) {
          truePositives++;
          matchedGold.add(i);
          break;
        }
      }
    }

    const precision = truePositives / preds.length;
    const recall = truePositives / golds.length;

    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
  }

  private normalizeMed(val: string): string {
    return val.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private detectHallucinations(prediction: ClinicalExtraction, transcript: string): boolean {
    const textToCheck: string[] = [
      prediction.chief_complaint,
      ...prediction.medications.map(m => m.name),
      ...prediction.diagnoses.map(d => d.description),
      ...prediction.plan,
      prediction.follow_up.reason || "",
    ].filter(t => t.length > 2);

    const transcriptLower = transcript.toLowerCase();

    for (const text of textToCheck) {
      // Simple grounding check: fuzzy match against transcript
      const bestMatch = fuzzball.extract(text.toLowerCase(), [transcriptLower], {
        scorer: fuzzball.partial_ratio
      })[0];

      if (bestMatch && bestMatch[1] < 60) {
        return true; // Likely hallucinated
      }
    }

    return false;
  }
}
