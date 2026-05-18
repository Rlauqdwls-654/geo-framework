import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const models = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
];

async function test() {
  for (const model of models) {
    try {
      const r = await client.models.generateContent({
        model,
        contents: "한국어로 인사해줘",
      });
      console.log(`✅ ${model}:`, r.text?.slice(0, 50));
    } catch (e: any) {
      console.log(`❌ ${model}:`, e.message?.slice(0, 100) || String(e).slice(0, 100));
    }
  }
}

test().catch(console.error);
