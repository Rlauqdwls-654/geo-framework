/** AI 플랫폼 종류 */
export type PlatformName = "openai" | "gemini" | "perplexity" | "google-ai-mode";

/** 단일 브랜드 언급 정보 */
export interface BrandMention {
  brand: string;
  sentence: string;
  context: string; // 전후 문맥
  sentiment: "positive" | "negative" | "neutral" | "recommendation" | "comparison";
}

/** 플랫폼별 수집 결과 */
export interface PlatformResult {
  platform: PlatformName;
  query: string;
  response: string;
  mentions: BrandMention[];
  timestamp: string; // ISO 8601
  error?: string;
}

/** 플랫폼 클라이언트 인터페이스 */
export interface PlatformClient {
  readonly name: PlatformName;
  query(input: PlatformQueryInput): Promise<PlatformResult>;
}

/** 플랫폼 쿼리 입력 */
export interface PlatformQueryInput {
  query: string;
  brand: string;
}
