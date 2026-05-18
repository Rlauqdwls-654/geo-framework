import "dotenv/config";

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || "",
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY || "",
  },
} as const;

export type ConfigKey = "OPENAI_API_KEY" | "GOOGLE_API_KEY" | "PERPLEXITY_API_KEY";

const KEY_PLATFORM_MAP: Record<string, ConfigKey> = {
  openai: "OPENAI_API_KEY",
  gemini: "GOOGLE_API_KEY",
  google: "GOOGLE_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

/**
 * 특정 플랫폼의 API 키만 검증한다.
 * @param platforms 검증할 플랫폼 이름 목록 (기본값: 전체)
 */
export function validateConfig(platforms?: string[]): string[] {
  const targetKeys = platforms
    ? platforms.map((p) => KEY_PLATFORM_MAP[p]).filter(Boolean)
    : Object.values(KEY_PLATFORM_MAP);

  const missing: string[] = [];

  for (const key of [...new Set(targetKeys)]) {
    if (key === "OPENAI_API_KEY" && !config.openai.apiKey) missing.push(key);
    if (key === "GOOGLE_API_KEY" && !config.google.apiKey) missing.push(key);
    if (key === "PERPLEXITY_API_KEY" && !config.perplexity.apiKey) missing.push(key);
  }

  return missing;
}
