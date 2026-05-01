import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { ClinicalExtractionSchema } from "@test-evals/shared";
import type { ExtractionResult, PromptStrategy } from "./types";

export class Extractor {
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async extract(
    transcript: string,
    strategy: PromptStrategy,
    model: string = "gemini-flash-latest"
  ): Promise<ExtractionResult> {
    let retries = 0;
    const maxRetries = 3;
    let feedback: string | null = null;

    // We can use a ChatSession to easily send previous messages and feedback
    const genModel = this.ai.getGenerativeModel({
      model: model,
      systemInstruction: strategy.getSystemPrompt(),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            chief_complaint: { type: SchemaType.STRING },
            vitals: {
              type: SchemaType.OBJECT,
              properties: {
                bp: { type: SchemaType.STRING, nullable: true },
                hr: { type: SchemaType.NUMBER, nullable: true },
                temp_f: { type: SchemaType.NUMBER, nullable: true },
                spo2: { type: SchemaType.NUMBER, nullable: true },
              }
            },
            medications: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  dose: { type: SchemaType.STRING },
                  frequency: { type: SchemaType.STRING },
                  route: { type: SchemaType.STRING },
                }
              }
            },
            diagnoses: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING },
                  icd10: { type: SchemaType.STRING, nullable: true },
                }
              }
            },
            plan: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            },
            follow_up: {
              type: SchemaType.OBJECT,
              properties: {
                interval_days: { type: SchemaType.NUMBER, nullable: true },
                reason: { type: SchemaType.STRING, nullable: true },
              }
            }
          }
        }
      }
    });

    const chat = genModel.startChat({ history: [] });

    let usageMetadata = { promptTokenCount: 0, candidatesTokenCount: 0, cachedContentTokenCount: 0 };

    while (retries <= maxRetries) {
      const messageContent = retries === 0 
        ? strategy.getUserPrompt(transcript)
        : `Validation failed with the following errors: ${feedback}. Please correct the JSON and try again.`;

      try {
        const result = await chat.sendMessage(messageContent);
        const responseText = result.response.text();
        
        let json;
        try {
          json = JSON.parse(responseText);
        } catch (e) {
          feedback = "Invalid JSON structure. Please ensure the response is strictly valid JSON.";
          retries++;
          continue;
        }

        // Accumulate tokens
        if (result.response.usageMetadata) {
           usageMetadata.promptTokenCount += result.response.usageMetadata.promptTokenCount || 0;
           usageMetadata.candidatesTokenCount += result.response.usageMetadata.candidatesTokenCount || 0;
           usageMetadata.cachedContentTokenCount += (result.response.usageMetadata as any).cachedContentTokenCount || 0;
        }

        const parsed = ClinicalExtractionSchema.safeParse(json);

        if (parsed.success) {
          return {
            data: parsed.data,
            rawResponse: responseText,
            usage: {
              inputTokens: usageMetadata.promptTokenCount,
              outputTokens: usageMetadata.candidatesTokenCount,
              cacheRead: usageMetadata.cachedContentTokenCount,
              cacheWrite: 0, // Gemini handles caching implicitly with Context Caching API
            },
            retries,
          };
        } else {
          feedback = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
          
          if (retries === maxRetries) {
            return {
              data: null,
              rawResponse: responseText,
              usage: {
                inputTokens: usageMetadata.promptTokenCount,
                outputTokens: usageMetadata.candidatesTokenCount,
                cacheRead: usageMetadata.cachedContentTokenCount,
                cacheWrite: 0,
              },
              retries,
              error: `Validation failed after ${maxRetries} attempts: ${feedback}`,
            };
          }
          retries++;
        }
      } catch (error: any) {
        console.error("Gemini API Error:", error.message);
        return {
          data: null,
          rawResponse: "",
          usage: { inputTokens: usageMetadata.promptTokenCount, outputTokens: usageMetadata.candidatesTokenCount, cacheRead: 0, cacheWrite: 0 },
          retries,
          error: error.message,
        };
      }
    }

    return {
      data: null,
      rawResponse: "Max retries exceeded",
      usage: { inputTokens: 0, outputTokens: 0, cacheRead: 0, cacheWrite: 0 },
      retries,
      error: "Max retries exceeded",
    };
  }
}
