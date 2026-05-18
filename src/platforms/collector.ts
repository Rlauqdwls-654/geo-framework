import type {
  PlatformClient,
  PlatformName,
  PlatformResult,
  PlatformQueryInput,
} from "./types.js";
import { OpenAIClient } from "./openai.js";
import { GeminiClient } from "./gemini.js";
import { PerplexityClient } from "./perplexity.js";
import { GoogleAiModeClient } from "./google-ai-mode.js";

/** 모든 플랫폼 결과를 담는 컨테이너 */
export interface CollectionResult {
  platform: PlatformName;
  result: PlatformResult;
  durationMs: number;
}

/** 기본 제공 플랫폼 목록 */
const PLATFORMS: PlatformName[] = ["openai", "gemini", "perplexity", "google-ai-mode"];

/**
 * 여러 AI 플랫폼에 쿼리를 동시에 전송하고 결과를 수집한다.
 */
export class Collector {
  private clients: Map<PlatformName, PlatformClient> = new Map();
  private enabledPlatforms: PlatformName[];

  constructor(platforms?: PlatformName[]) {
    this.enabledPlatforms = platforms ?? PLATFORMS;

    // 필요한 플랫폼 클라이언트만 생성
    for (const name of this.enabledPlatforms) {
      this.clients.set(name, this.createClient(name));
    }
  }

  private createClient(name: PlatformName): PlatformClient {
    switch (name) {
      case "openai":
        return new OpenAIClient();
      case "gemini":
        return new GeminiClient();
      case "perplexity":
        return new PerplexityClient();
      case "google-ai-mode":
        return new GoogleAiModeClient();
      default:
        throw new Error(`Unknown platform: ${name}`);
    }
  }

  /**
   * 단일 쿼리를 모든 활성화된 플랫폼에 전송한다.
   */
  async queryAll(input: PlatformQueryInput): Promise<CollectionResult[]> {
    const tasks = this.enabledPlatforms.map(async (platform) => {
      const client = this.clients.get(platform)!;
      const start = Date.now();
      const result = await client.query(input);
      const durationMs = Date.now() - start;
      return { platform, result, durationMs };
    });

    return Promise.all(tasks);
  }

  /**
   * 여러 쿼리를 모든 플랫폼에 전송한다.
   */
  async queryBatch(
    inputs: PlatformQueryInput[]
  ): Promise<CollectionResult[][]> {
    const allResults: CollectionResult[][] = [];

    for (const input of inputs) {
      const results = await this.queryAll(input);
      allResults.push(results);
    }

    return allResults;
  }

  /**
   * 활성화된 플랫폼 목록을 반환한다.
   */
  getActivePlatforms(): PlatformName[] {
    return [...this.enabledPlatforms];
  }
}
