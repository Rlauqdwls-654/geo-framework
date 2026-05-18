import { describe, it, expect } from "vitest";
import { MentionDetector } from "../src/platforms/mention-detector.js";

describe("MentionDetector", () => {
  const detector = new MentionDetector();

  it("브랜드명이 포함된 문장을 탐지해야 함", () => {
    const text = "부산 카페 중에서 터미널 에스프레소 하우스가 정말 좋아요.";
    const mentions = detector.detect(text, "터미널 에스프레소 하우스");

    expect(mentions).toHaveLength(1);
    expect(mentions[0].brand).toBe("터미널 에스프레소 하우스");
    expect(mentions[0].sentiment).toBe("positive");
  });

  it("브랜드명이 없으면 빈 배열을 반환해야 함", () => {
    const text = "부산 카페 중에서 원두 로스팅이 좋은 곳을 추천해주세요.";
    const mentions = detector.detect(text, "터미널 에스프레소 하우스");

    expect(mentions).toHaveLength(0);
  });

  it("긴 텍스트에서 여러 브랜드 인용을 탐지해야 함", () => {
    const text = `부산에 있는 카페들을 알아보고 있어요.
      터미널 에스프레소 하우스는 원두를 직접 로스팅해서 유명해요.
      분위기도 좋고 커피도 맛있어서 데이트 코스로 추천해요.
      다른 곳으로는 날리자쿠 카페도 있는데 거기도 괜찮아요.`;

    const mentions = detector.detectAll(text, ["터미널 에스프레소 하우스", "날리자쿠"]);
    expect(mentions).toHaveLength(2);
  });

  it("추천 문장을 올바르게 분류해야 함", () => {
    const text = "데이트 코스로 터미널 에스프레소 하우스를 강력 추천합니다.";
    const mentions = detector.detect(text, "터미널 에스프레소 하우스");

    expect(mentions[0].sentiment).toBe("recommendation");
  });

  it("비교 문장을 올바르게 분류해야 함", () => {
    const text = "터미널 에스프레소 하우스보다 스타벅스가 더 가깝긴 해요.";
    const mentions = detector.detect(text, "터미널 에스프레소 하우스");

    expect(mentions[0].sentiment).toBe("comparison");
  });

  it("전후 문맥을 올바르게 추출해야 함", () => {
    const sentences = [
      "부산 여행을 계획 중입니다.",
      "데이트 코스로 강력 추천하는 곳이 있어요.",
      "터미널 에스프레소 하우스는 분위기가 정말 좋습니다.",
      "원두도 직접 로스팅해서 커피 맛이 일품이에요.",
      "주말에 방문하면 사람이 많을 수 있어요.",
    ];
    const text = sentences.join(". ");

    const mentions = detector.detect(text, "터미널 에스프레소 하우스");

    expect(mentions).toHaveLength(1);
    // 전후 2문장씩 포함하는지 확인 (총 5문장 중 가운데 문장이므로)
    expect(mentions[0].context).toContain("데이트 코스");
    expect(mentions[0].context).toContain("주말에 방문");
  });
});
