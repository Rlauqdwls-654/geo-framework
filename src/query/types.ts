/** GEO 쿼리 생성 입력 */
export interface QueryInput {
  brand: string;
  purpose: string;
}

/** 생성된 GEO 쿼리 (외부용) */
export interface GeneratedQuery {
  brand: string;
  purpose: string;
  categories: string[];
  queries: string[];
  generatedAt: string; // ISO 8601
  /** API 원본 응답 (디버깅용) */
  raw?: {
    categories: string[];
    queries: Array<{ category: string; query: string }>;
  };
}

/** category + query 쌍 (내부용) */
export interface CategorizedQuery {
  category: string;
  query: string;
}
