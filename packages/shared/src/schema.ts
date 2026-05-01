import { z } from "zod";

export const MedicationSchema = z.object({
  name: z.string(),
  dose: z.string().optional().default("not specified"),
  frequency: z.string().optional().default("not specified"),
  route: z.string().optional().default("not specified"),
});

export const DiagnosisSchema = z.object({
  description: z.string(),
  icd10: z.string().optional().nullable(),
});

export const ClinicalExtractionSchema = z.object({
  chief_complaint: z.string().default(""),
  vitals: z.object({
    bp: z.string().nullable().default(null),
    hr: z.number().nullable().default(null),
    temp_f: z.number().nullable().default(null),
    spo2: z.number().nullable().default(null),
  }).default({}),
  medications: z.array(MedicationSchema).default([]),
  diagnoses: z.array(DiagnosisSchema).default([]),
  plan: z.array(z.string()).default([]),
  follow_up: z.object({
    interval_days: z.number().nullable().default(null),
    reason: z.string().nullable().default(null),
  }).default({}),
});

export type Medication = z.infer<typeof MedicationSchema>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type ClinicalExtraction = z.infer<typeof ClinicalExtractionSchema>;
