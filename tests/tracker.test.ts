import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { rm, mkdir } from "node:fs/promises";
import { Storage, type MeasurementSession } from "../src/tracker/storage.js";
import { Analyzer } from "../src/tracker/analyzer.js";

const TEST_DATA_DIR = "data_test";

describe("Storage", () => {
  const storage = new Storage();

  const mockSession: MeasurementSession = {
    id: "test-001",
    brand: "테스트 브랜드",
    experimentName: "테스트 실험",
    phase: "baseline",
    date: "2026-05-18T00:00:00.000Z",
    queries: [
      [
        {
          platform: "openai",
          query: "카페 추천",
          response: "터미널 에스프레소 하우스를 추천합니다.",
          mentions: [
            {
              brand: "테스트 브랜드",
              sentence: "터미널 에스프레소 하우스를 추천합니다.",
              context: "부산 카페 중에서 터미널 에스프레소 하우스를 추천합니다.",
              sentiment: "recommendation",
            },
          ],
          timestamp: "2026-05-18T00:00:00.000Z",
        },
      ],
    ],
  };

  it("데이터를 저장하고 로드할 수 있어야 함", async () => {
    const filePath = await storage.save(mockSession);
    expect(filePath).toBeTruthy();

    const loaded = await storage.load(filePath);
    expect(loaded.brand).toBe("테스트 브랜드");
    expect(loaded.phase).toBe("baseline");
    expect(loaded.queries).toHaveLength(1);
  });

  it("브랜드별 목록을 조회할 수 있어야 함", async () => {
    const sessions = await storage.listByBrand("테스트 브랜드");
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Analyzer", () => {
  const analyzer = new Analyzer();

  const baseline: MeasurementSession = {
    id: "baseline-001",
    brand: "테스트 브랜드",
    experimentName: "GEO 테스트",
    phase: "baseline",
    date: "2026-05-01T00:00:00.000Z",
    queries: [
      [
        {
          platform: "openai",
          query: "카페 추천",
          response: "부산 카페를 추천합니다.",
          mentions: [],
          timestamp: "2026-05-01T00:00:00.000Z",
        },
        {
          platform: "gemini",
          query: "카페 추천",
          response: "부산 카페를 추천합니다.",
          mentions: [],
          timestamp: "2026-05-01T00:00:00.000Z",
        },
      ],
    ],
  };

  const post: MeasurementSession = {
    id: "post-001",
    brand: "테스트 브랜드",
    experimentName: "GEO 테스트",
    phase: "post",
    date: "2026-05-18T00:00:00.000Z",
    queries: [
      [
        {
          platform: "openai",
          query: "카페 추천",
          response: "터미널 에스프레소 하우스를 추천합니다. 커피가 맛있어요.",
          mentions: [
            {
              brand: "테스트 브랜드",
              sentence: "터미널 에스프레소 하우스를 추천합니다.",
              context: "부산 카페 중 터미널 에스프레소 하우스를 추천합니다.",
              sentiment: "recommendation",
            },
          ],
          timestamp: "2026-05-18T00:00:00.000Z",
        },
        {
          platform: "gemini",
          query: "카페 추천",
          response: "부산 카페를 추천합니다.",
          mentions: [],
          timestamp: "2026-05-18T00:00:00.000Z",
        },
      ],
    ],
  };

  it("베이스라인 vs 배포 후 비교 리포트를 생성해야 함", () => {
    const report = analyzer.compare(baseline, post);

    expect(report.brand).toBe("테스트 브랜드");
    expect(report.summary.baseline.totalMentions).toBe(0);
    expect(report.summary.post.totalMentions).toBe(1);
    expect(report.summary.change.mentionChange).toBe(1);
    expect(report.summary.change.mentionPercentChange).toBe(100);
  });

  it("마크다운 리포트를 생성해야 함", () => {
    const report = analyzer.compare(baseline, post);
    const md = analyzer.toMarkdown(report);

    expect(md).toContain("# GEO 리포트");
    expect(md).toContain("테스트 브랜드");
    expect(md).toContain("| 0 | 1 |");
    expect(md).toContain("+100%");
  });

  it("변화가 없는 경우 0% 변화를 표시해야 함", () => {
    const sameBaseline: MeasurementSession = {
      ...baseline,
      queries: [
        [
          {
            platform: "openai",
            query: "카페 추천",
            response: "테스트 브랜드입니다.",
            mentions: [
              {
                brand: "테스트 브랜드",
                sentence: "테스트 브랜드입니다.",
                context: "테스트 브랜드입니다.",
                sentiment: "neutral",
              },
            ],
            timestamp: "2026-05-01T00:00:00.000Z",
          },
        ],
      ],
    };
    const samePost: MeasurementSession = {
      ...post,
      queries: [
        [
          {
            platform: "openai",
            query: "카페 추천",
            response: "테스트 브랜드입니다.",
            mentions: [
              {
                brand: "테스트 브랜드",
                sentence: "테스트 브랜드입니다.",
                context: "테스트 브랜드입니다.",
                sentiment: "neutral",
              },
            ],
            timestamp: "2026-05-18T00:00:00.000Z",
          },
        ],
      ],
    };

    const report = analyzer.compare(sameBaseline, samePost);
    expect(report.summary.change.mentionChange).toBe(0);
    expect(report.summary.change.mentionPercentChange).toBe(0);
  });
});
