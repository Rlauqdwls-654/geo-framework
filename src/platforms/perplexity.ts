import type { PlatformClient, PlatformResult, PlatformQueryInput } from "./types.js";
import { MentionDetector } from "./mention-detector.js";
import { config } from "../config.js";

/**
 * Perplexity API는 OpenAI 호환 API를 사용한다.
 * https://docs.perplexity.ai/reference/post_chat_completions
 */
export class PerplexityClient implements PlatformClient {
  readonly name = "perplexity" as const;
  private detector: MentionDetector;

  constructor() {
    this.detector = new MentionDetector();
  }

  async query(input: PlatformQueryInput): Promise<PlatformResult> {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.perplexity.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "user",
              content: input.query,
            },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0]?.message?.content || "";
      const mentions = this.detector.detect(content, input.brand);

      return {
        platform: "perplexity",
        query: input.query,
        response: content,
        mentions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        platform: "perplexity",
        query: input.query,
        response: "",
        mentions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
