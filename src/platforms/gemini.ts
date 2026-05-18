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

  /**
   * 응답 텍스트에서 URL 추출
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s\n)"'\]]+/g;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
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

          // 브랜드 인용 탐지
          const mentions = this.detector.detect(content, input.brand);

          // 응답에 포함된 출처 URL 추출
          const urls = this.extractUrls(content);

          const result: PlatformResult & { urls?: string[] } = {
            platform: "gemini",
            query: input.query,
            response: content,
            mentions,
            timestamp: new Date().toISOString(),
          };

          if (urls.length > 0) {
            result.urls = urls;
          }

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const msg = lastError.message.toLowerCase();
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
            await sleep([3000, 6000, 10000][attempt] || 5000);
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
