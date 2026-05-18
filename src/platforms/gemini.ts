import { GoogleGenAI } from "@google/genai";
import type { PlatformClient, PlatformResult, PlatformQueryInput } from "./types.js";
import { MentionDetector } from "./mention-detector.js";
import { config } from "../config.js";

const MODEL = "gemini-2.0-flash";

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
    try {
      const response = await this.getClient().models.generateContent({
        model: MODEL,
        contents: input.query,
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
      return {
        platform: "gemini",
        query: input.query,
        response: "",
        mentions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
