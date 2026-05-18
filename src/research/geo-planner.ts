import { GoogleGenAI } from "@google/genai";
import type { BrandProfile } from "./brand-researcher.js";
import { config } from "../config.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeoQueryPlan {
  brand: string;
  profile: BrandProfile;
  categories: GeoCategory[];
  queries: GeoQuery[];
  totalQueries: number;
}

export interface GeoCategory {
  name: string;
  description: string;
}

export interface GeoQuery {
  query: string;
  category: string;
}

const GEO_PLANNER_PROMPT = `당신은 GEO(Generative Engine Optimization) 전문가입니다.
아래 브랜드 프로필을 바탕으로 GEO 검색어를 생성해주세요.

## 핵심 규칙
1. 브랜드명이 검색어에 직접 등장하면 안 됨
2. 검색어는 짧고 간결하게 (실제 사람이 검색창에 칠 법한 수준)
   - 좋은 예: "부산 데이트 코스", "부산 놀거리 추천", "가족 나들이"
   - 나쁜 예: "비 오는 날 부산에서 커플끼리 갈 만한 곳 있을까?"
3. 브랜드의 위치/지역/도메인 기반
4. 브랜드의 차별점이 자연스럽게 답변에 포함될 수 있어야 함
5. 각 검색어는 하나의 카테고리에 속해야 함

## 출력 형식
{
  "categories": [
    { "name": "카테고리명", "description": "짧은 설명" }
  ],
  "queries": [
    { "query": "검색어", "category": "카테고리명" }
  ]
}

카테고리는 3~5개, 총 쿼리는 15개를 생성해주세요.`;

export class GeoPlanner {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.google.apiKey });
  }

  private async callGemini(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.7, maxOutputTokens: 4096 },
          });
          const text = response.text;
          if (text) return text;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message.toLowerCase();
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
            const delay = [3000, 6000, 10000][attempt] || 5000;
            await sleep(delay);
            continue;
          }
          if (msg.includes("404") || msg.includes("not found")) break;
          await sleep(2000);
        }
      }
    }
    throw lastError || new Error("Gemini API 호출 실패");
  }

  async plan(profile: BrandProfile): Promise<GeoQueryPlan> {
    const profileText = JSON.stringify(profile, null, 2);

    const content = await this.callGemini(
      `${GEO_PLANNER_PROMPT}\n\n## 브랜드 프로필\n${profileText}\n\n위 브랜드의 GEO 검색어 15개를 생성해주세요.`
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 추출 실패");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      brand: profile.brand,
      profile,
      categories: parsed.categories || [],
      queries: parsed.queries || [],
      totalQueries: (parsed.queries || []).length,
    };
  }
}
