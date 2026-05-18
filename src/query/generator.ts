import { GoogleGenAI } from "@google/genai";
import type { QueryInput, GeneratedQuery } from "./types.js";
import { config } from "../config.js";

// 테스트된 동작 모델 (gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview)
const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

const QUERY_GENERATION_PROMPT = `당신은 GEO(Generative Engine Optimization) 전문가입니다.
사용자가 브랜드명과 목적을 입력하면, 실제 한국 사용자가 AI 검색 엔진(ChatGPT, Gemini, Perplexity, Google)에
질문할 법한 자연스러운 검색어를 생성해주세요.

## 중요 규칙
1. 브랜드명이 직접 등장하는 검색어는 절대 만들지 마세요
2. 실제 한국인이 묻는 방식으로 만들어야 함 (짧고 구어체)
3. 브랜드의 도메인에 따라 쿼리 스타일을 바꿔야 함
4. 각 쿼리는 반드시 하나의 카테고리에 속해야 함

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"categories":["카테고리1","카테고리2"],"queries":[{"category":"카테고리1","query":"검색어1"}]}
카테고리는 2~4개, 총 쿼리는 5~10개 생성해주세요.`;

/** 지정된 시간(ms) 동안 대기 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class QueryGenerator {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: config.google.apiKey });
  }

  async generate(input: QueryInput): Promise<GeneratedQuery> {
    const userPrompt = `브랜드: ${input.brand}\n목적: ${input.purpose}\n\n위 브랜드가 AI 검색 결과에 자연스럽게 언급될 수 있는 검색어를 생성해주세요.`;

    let lastError: Error | null = null;

    // 여러 모델 시도 + 재시도
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await this.client.models.generateContent({
            model,
            contents: [
              { role: "user", parts: [{ text: QUERY_GENERATION_PROMPT }] },
              { role: "user", parts: [{ text: userPrompt }] },
            ],
            config: { temperature: 0.7, maxOutputTokens: 2048 },
          });

          const content = response.text;
          if (!content) throw new Error("빈 응답");

          // JSON 추출
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : content;
          const parsed = JSON.parse(jsonStr);

          return {
            brand: input.brand,
            purpose: input.purpose,
            categories: parsed.categories || [],
            queries: (parsed.queries || []).map(
              (q: { category: string; query: string }) => q.query
            ),
            generatedAt: new Date().toISOString(),
            raw: parsed,
          };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message.toLowerCase();
          // 503(과부하)이면 잠시 후 재시도
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
            const delay = [3000, 6000, 10000][attempt] || 5000;
            console.log(`   ⏳ ${model} 과부하, ${delay/1000}초 후 재시도...`);
            await sleep(delay);
            continue;
          }
          // 404(모델 없음)면 다음 모델로
          if (msg.includes("404") || msg.includes("not found")) break;
          // 그 외 에러는 재시도
          await sleep(1000);
        }
      }
    }

    throw lastError || new Error("쿼리 생성 실패: 모든 모델/시도 실패");
  }
}
