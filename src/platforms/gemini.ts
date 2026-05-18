import { GoogleGenAI } from "@google/genai";
import type { PlatformClient, PlatformResult, PlatformQueryInput } from "./types.js";
import { MentionDetector } from "./mention-detector.js";
import { config } from "../config.js";

const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiClient implements PlatformClient {
  readonly name = "gemini" as const;
  private client: GoogleGenAI | null = null;
  private detector: MentionDetector;

  constructor() {
    this.detector = new MentionDetector();
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: config.google.apiKey });
    }
    return this.client;
  }

  async query(input: PlatformQueryInput): Promise<PlatformResult> {
    let lastError: Error | null = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await this.getClient().models.generateContent({
            model,
            contents: input.query,
            config: { maxOutputTokens: 1024 },
          });

          const content = response.text || "";
          const mentions = this.detector.detect(content, input.brand);

          return {
            platform: "gemini",
            query: input.query,
            response: content,
            mentions,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const msg = lastError.message.toLowerCase();
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
            const delay = [3000, 6000, 10000][attempt] || 5000;
            await sleep(delay);
            continue;
          }
          if (msg.includes("404") || msg.includes("not found")) break;
          await sleep(1000);
        }
      }
    }

    return {
      platform: "gemini",
      query: input.query,
      response: "",
      mentions: [],
      timestamp: new Date().toISOString(),
      error: lastError?.message || "Gemini API 오류",
    };
  }
}
