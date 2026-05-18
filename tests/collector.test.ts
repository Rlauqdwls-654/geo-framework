import { describe, it, expect } from "vitest";
import { Collector } from "../src/platforms/collector.js";

describe("Collector", () => {
  it("특정 플랫폼만 활성화할 수 있어야 함", () => {
    const collector = new Collector(["openai"]);
    const platforms = collector.getActivePlatforms();

    expect(platforms).toEqual(["openai"]);
  });

  it("모든 플랫폼이 기본 활성화되어야 함", () => {
    const collector = new Collector();
    const platforms = collector.getActivePlatforms();

    expect(platforms).toContain("openai");
    expect(platforms).toContain("gemini");
    expect(platforms).toContain("perplexity");
    expect(platforms).toHaveLength(3);
  });

  it("API 키가 없어도 collector는 생성되어야 함", () => {
    expect(() => new Collector()).not.toThrow();
  });

  it("비어있는 플랫폼 배열로 생성 가능해야 함", () => {
    const collector = new Collector([]);
    expect(collector.getActivePlatforms()).toHaveLength(0);
  });
});
