import type { PlatformResult } from "./types.js";

export interface SourceInfo {
  /** 출처 URL (AI 응답에 포함된 링크) */
  url: string;
  /** 출처 제목 */
  title: string;
  /** 출처 설명/스니펫 */
  snippet: string;
  /** 출처 도메인 (naver.com, daum.net 등) */
  domain: string;
  /** 출처 유형 */
  type: "blog" | "news" | "cafe" | "official" | "community" | "other";
}

/**
 * AI 플랫폼의 응답에서 출처(인용 소스)를 추출한다.
 * 각 플랫폼은 응답에 참고한 출처를 포함하는 경우가 있다.
 */
export class SourceScraper {
  /**
   * OpenAI 응답에서 출처 URL 추출
   * OpenAI는 응답 텍스트에 URL을 포함하는 경우가 많음
   */
  extractFromOpenAI(response: string): SourceInfo[] {
    const sources: SourceInfo[] = [];

    // URL 패턴 찾기
    const urlRegex = /https?:\/\/[^\s\n)"']+(?:\.(?:com|kr|net|org|io|me|co\.kr))[^\s\n)"']*/g;
    const urls = response.match(urlRegex) || [];

    for (const url of [...new Set(urls)]) {
      const domain = this.extractDomain(url);
      const type = this.classifySource(domain);

      sources.push({
        url: url.replace(/[.]+$/, ""),
        title: "",
        snippet: "",
        domain,
        type,
      });
    }

    return sources;
  }

  /**
   * Gemini 응답에서 출처 추출
   * Gemini는 URL을 포함하거나, "출처: " 형태로 제공
   */
  extractFromGemini(response: string): SourceInfo[] {
    const sources: SourceInfo[] = [];

    // URL 패턴
    const urlRegex = /https?:\/\/[^\s\n)"']+(?:\.(?:com|kr|net|org|io|me|co\.kr))[^\s\n)"']*/g;
    const urls = response.match(urlRegex) || [];

    for (const url of [...new Set(urls)]) {
      const domain = this.extractDomain(url);
      const type = this.classifySource(domain);

      sources.push({
        url: url.replace(/[.]+$/, ""),
        title: "",
        snippet: "",
        domain,
        type,
      });
    }

    // "출처: " 또는 "참고: " 패턴 찾기
    const refRegex = /(?:출처|참고|자료|source|reference)\s*[:：]\s*([^\n]+)/gi;
    let match;
    while ((match = refRegex.exec(response)) !== null) {
      const text = match[1].trim();
      if (text && !text.startsWith("http")) {
        sources.push({
          url: "",
          title: text.slice(0, 100),
          snippet: text,
          domain: "text-reference",
          type: "other",
        });
      }
    }

    return sources;
  }

  /**
   * Google AI Mode 응답에서 출처 추출
   * Google 검색 결과는 인용된 출처 정보를 포함
   */
  extractFromGoogle(response: string): SourceInfo[] {
    const sources: SourceInfo[] = [];

    // URL 추출
    const urlRegex = /https?:\/\/[^\s\n)"']+(?:\.(?:com|kr|net|org|io|me|co\.kr))[^\s\n)"']*/g;
    const urls = response.match(urlRegex) || [];

    for (const url of [...new Set(urls)]) {
      const domain = this.extractDomain(url);
      const type = this.classifySource(domain);

      sources.push({
        url: url.replace(/[.]+$/, ""),
        title: "",
        snippet: "",
        domain,
        type,
      });
    }

    return sources;
  }

  /**
   * 모든 플랫폼에서 출처 추출 (자동 감지)
   */
  extract(platform: string, response: string): SourceInfo[] {
    switch (platform) {
      case "openai":
        return this.extractFromOpenAI(response);
      case "gemini":
        return this.extractFromGemini(response);
      case "google-ai-mode":
        return this.extractFromGoogle(response);
      default:
        return this.extractFromOpenAI(response);
    }
  }

  /**
   * 도메인 추출
   */
  public extractDomain(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace("www.", "");
    } catch {
      return url;
    }
  }

  /**
   * 출처 유형 분류
   */
  public classifySource(domain: string): SourceInfo["type"] {
    if (domain.includes("blog") || domain.includes("tistory") || domain.includes("brunch")) return "blog";
    if (domain.includes("news") || domain.includes("newswire") || domain.match(/\.(hani|donga|chosun|joongang|mk|sedaily)\./)) return "news";
    if (domain.includes("cafe.naver")) return "cafe";
    if (domain.includes("place") || domain.includes("map")) return "official";
    if (domain.includes("twitter") || domain.includes("instagram") || domain.includes("facebook")) return "community";
    return "other";
  }

  /**
   * PlatformResult에 출처 정보 추가
   */
  analyze(result: PlatformResult): PlatformResult & { sources: SourceInfo[] } {
    const sources = this.extract(result.platform, result.response);
    return { ...result, sources };
  }
}
