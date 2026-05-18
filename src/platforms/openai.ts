import OpenAI from "openai";
import type { PlatformClient, PlatformResult, PlatformQueryInput } from "./types.js";
import { MentionDetector } from "./mention-detector.js";
import { config } from "../config.js";

const MODEL = "gpt-4o-mini";

export class OpenAIClient implements PlatformClient {
  readonly name = "openai" as const;
  private client: OpenAI;
  private detector: MentionDetector;

  constructor() {
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.detector = new MentionDetector();
  }

  async query(input: PlatformQueryInput): Promise<PlatformResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: input.query,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content || "";
      const mentions = this.detector.detect(content, input.brand);

      return {
        platform: "openai",
        query: input.query,
        response: content,
        mentions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        platform: "openai",
        query: input.query,
        response: "",
        mentions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
