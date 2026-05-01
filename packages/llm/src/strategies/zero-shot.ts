import type { PromptStrategy } from "../types";

export class ZeroShotStrategy implements PromptStrategy {
  name = "zero_shot";

  getSystemPrompt(): string {
    return `You are an expert clinical scribe. Your task is to extract structured information from doctor-patient transcripts.
Strictly adhere to the provided tool schema. Ensure all fields are filled accurately.
If a value is not mentioned, use null for optional fields or an empty array/string where appropriate.
Focus on:
- Chief complaint (patient's primary reason for visit)
- Vitals (BP, Heart Rate, Temp, SpO2)
- Medications (Name, Dose, Frequency, Route)
- Diagnoses (Description and ICD-10 code if mentioned)
- Plan (Actionable steps)
- Follow-up (Interval in days and reason)`;
  }

  getUserPrompt(transcript: string): string {
    return `Please extract the clinical data from the following transcript:

<transcript>
${transcript}
</transcript>`;
  }
}
