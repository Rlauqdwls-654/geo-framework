import type { BrandMention } from "./types.js";

const CONTEXT_RANGE = 2;

export class MentionDetector {
  private splitSentences(text: string): string[] {
    const raw = text.split(/(?<=[.!?])\s+|(?<=\n)/);
    return raw.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private classifySentiment(
    sentence: string,
    _brand: string
  ): BrandMention["sentiment"] {
    // 추천 키워드 (우선 매칭)
    const recommendation = ["꼭 ", "강력 추천", "가볼 만한", "들러보세요", "꼭 가보세요", "추천합니다", "추천해요"];
    for (const w of recommendation) {
      if (sentence.includes(w)) return "recommendation";
    }

    // 긍정 키워드 (어미 변화 포괄)
    const positive = ["좋", "최고", "훌륭", "만족", "인기", "맛있", "감성", "분위기", "멋", "깔끔"];
    for (const w of positive) {
      if (sentence.includes(w)) return "positive";
    }

    // 부정 키워드
    const negative = ["별로", "아쉽", "불편", "실망", "비추", "나쁘"];
    for (const w of negative) {
      if (sentence.includes(w)) return "negative";
    }

    // 비교 키워드
    const comparison = ["보다", "비교", "차이", "대비", "대안"];
    for (const w of comparison) {
      if (sentence.includes(w)) return "comparison";
    }

    return "neutral";
  }

  detect(text: string, brand: string): BrandMention[] {
    const sentences = this.splitSentences(text);
    const mentions: BrandMention[] = [];

    sentences.forEach((sentence, index) => {
      if (sentence.includes(brand)) {
        const start = Math.max(0, index - CONTEXT_RANGE);
        const end = Math.min(sentences.length, index + CONTEXT_RANGE + 1);
        const context = sentences.slice(start, end).join(" ");

        mentions.push({
          brand,
          sentence: sentence.trim(),
          context: context.trim(),
          sentiment: this.classifySentiment(sentence, brand),
        });
      }
    });

    return mentions;
  }

  detectAll(text: string, brands: string[]): BrandMention[] {
    return brands.flatMap((brand) => this.detect(text, brand));
  }
}
