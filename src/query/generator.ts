import OpenAI from "openai";
import type { QueryInput, GeneratedQuery } from "./types.js";
import { config } from "../config.js";

const QUERY_GENERATION_PROMPT = `당신은 GEO(Generative Engine Optimization) 전문가입니다.
사용자가 브랜드명과 목적을 입력하면, 실제 한국 사용자가 AI 검색 엔진(ChatGPT, Gemini, Perplexity, Google)에
질문할 법한 자연스러운 검색어를 생성해주세요.

## 중요 규칙
1. 브랜드명이 직접 등장하는 검색어는 절대 만들지 마세요
   - ❌ "터미널 에스프레소 하우스 어때?"
   - ❌ "날리자쿠 플랫폼 후기"
   - ✅ "부산 스페셜티 커피 카페 추천" → 답변에 터미널 에스프레소가 언급될 수 있음
   - ✅ "플립러닝 수업 운영 플랫폼 추천" → 답변에 날리자쿠가 언급될 수 있음

2. 실제 한국인이 묻는 방식으로 만들어야 함
   - 짧고 구어체일수록 좋음
   - SNS, 커뮤니티에서 자주 보이는 질문 스타일
   - "추천", "비교", "어때?", "어디야?", "뭐 있어?" 같은 표현 활용

3. 브랜드의 도메인에 따라 쿼리 스타일을 바꿔야 함

4. 각 쿼리는 반드시 하나의 카테고리에 속해야 함

## 출력 형식
반드시 아래 JSON 배열 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "categories": ["카테고리1", "카테고리2", ...],
  "queries": [
    { "category": "카테고리1", "query": "검색어1" },
    { "category": "카테고리2", "query": "검색어2" }
  ]
}
카테고리는 2~4개, 총 쿼리는 5~10개 생성해주세요.`;

export class QueryGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async generate(input: QueryInput): Promise<GeneratedQuery> {
    const userPrompt = `브랜드: ${input.brand}
목적: ${input.purpose}

위 브랜드가 AI 검색 결과에 자연스럽게 언급될 수 있는 검색어를 생성해주세요.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: QUERY_GENERATION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("쿼리 생성 실패: 응답이 비어있음");
    }

    const parsed = JSON.parse(content);

    return {
      brand: input.brand,
      purpose: input.purpose,
      categories: parsed.categories,
      queries: parsed.queries.map(
        (q: { category: string; query: string }) => q.query
      ),
      generatedAt: new Date().toISOString(),
      raw: parsed,
    };
  }
}
