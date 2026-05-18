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

export function validateConfig(): string[] {
  const missing: string[] = [];
  if (!config.openai.apiKey) missing.push("OPENAI_API_KEY");
  if (!config.google.apiKey) missing.push("GOOGLE_API_KEY");
  if (!config.perplexity.apiKey) missing.push("PERPLEXITY_API_KEY");
  return missing;
}
