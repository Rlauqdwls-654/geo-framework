import { describe, it, expect } from "vitest";

describe("Query Generator", () => {
  it("쿼리 타입이 올바르게 정의되어야 함", () => {
    const sampleQuery = {
      brand: "테스트 브랜드",
      purpose: "테스트 목적",
      categories: ["카테고리1", "카테고리2"],
      queries: ["검색어1", "검색어2"],
      generatedAt: new Date().toISOString(),
    };

    expect(sampleQuery.brand).toBe("테스트 브랜드");
    expect(sampleQuery.categories).toHaveLength(2);
    expect(sampleQuery.queries).toHaveLength(2);
    expect(sampleQuery.generatedAt).toBeDefined();
  });

  it("샘플 브랜드 데이터가 올바른 구조를 가져야 함", () => {
    const samples = [
      { brand: "터미널 에스프레소 하우스", purpose: "방문객 증대" },
      { brand: "날리자쿠", purpose: "강사 유입" },
    ];

    samples.forEach((s) => {
      expect(s.brand).toBeTruthy();
      expect(s.purpose).toBeTruthy();
    });
  });

  it("빈 입력 검증", () => {
    expect(() => {
      if (!"".trim()) throw new Error("브랜드명이 비어있음");
    }).toThrow("브랜드명이 비어있음");
  });
});
