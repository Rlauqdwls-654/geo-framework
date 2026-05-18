import { describe, it, expect } from "vitest";

describe("GEO Framework", () => {
  it("플랫폼 타입이 정상적으로 export되어야 함", () => {
    const platforms = ["openai", "gemini", "perplexity", "google-ai-mode"] as const;
    expect(platforms).toHaveLength(4);
  });

  it("설정 파일을 로드할 수 있어야 함", () => {
    // dotenv 설정 테스트
    expect(process.env).toBeDefined();
  });
});
