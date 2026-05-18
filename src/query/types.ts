/** GEO 쿼리 생성 입력 */
export interface QueryInput {
  brand: string;
  purpose: string;
}

/** 생성된 GEO 쿼리 */
export interface GeneratedQuery {
  brand: string;
  purpose: string;
  categories: string[];
  queries: string[];
}
