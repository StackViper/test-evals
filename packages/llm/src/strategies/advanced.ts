import type { PromptStrategy } from "../types";

export class FewShotStrategy implements PromptStrategy {
  name = "few_shot";

  getSystemPrompt(): string {
    return `You are an expert clinical scribe. Extract structured data from transcripts.
Below are several examples of how to handle specific clinical scenarios:

<example>
Transcript: "Patient reports a dull ache in the chest. BP is 120 over 80. They take Aspirin 81mg daily."
Extraction: {
  "chief_complaint": "Chest pain",
  "vitals": { "bp": "120/80", "hr": null, "temp_f": null, "spo2": null },
  "medications": [{ "name": "Aspirin", "dose": "81mg", "frequency": "daily", "route": "oral" }],
  "diagnoses": [],
  "plan": ["Continue Aspirin"],
  "follow_up": { "interval_days": null, "reason": null }
}
</example>

<example>
Transcript: "Doctor: Your blood sugar is high, looks like Type 2 Diabetes. Let's start Metformin 500mg twice a day."
Extraction: {
  "chief_complaint": "Follow up blood sugar",
  "vitals": { "bp": null, "hr": null, "temp_f": null, "spo2": null },
  "medications": [{ "name": "Metformin", "dose": "500mg", "frequency": "twice a day", "route": "oral" }],
  "diagnoses": [{ "description": "Type 2 Diabetes", "icd10": "E11.9" }],
  "plan": ["Start Metformin 500mg BID"],
  "follow_up": { "interval_days": null, "reason": null }
}
</example>

Always follow the schema strictly. Use null for missing data.`;
  }

  getUserPrompt(transcript: string): string {
    return `Please extract the clinical data from the following transcript:
<transcript>
${transcript}
</transcript>`;
  }
}

export class ChainOfThoughtStrategy implements PromptStrategy {
  name = "cot";

  getSystemPrompt(): string {
    return `You are an expert clinical scribe. Before calling the extraction tool, follow this thinking process:
1. List all symptoms and identify the primary concern.
2. Extract every numerical vital sign mentioned.
3. Identify every medication and its specific dosage/frequency.
4. List potential diagnoses and their ICD-10 codes.
5. Summarize the treatment plan and next steps.
Finally, provide the structured JSON based on your analysis.`;
  }

  getUserPrompt(transcript: string): string {
    return `Analyze and extract data from this transcript:
<transcript>
${transcript}
</transcript>`;
  }
}
