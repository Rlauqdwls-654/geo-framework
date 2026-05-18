import { chromium, type Browser } from "playwright";

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  type: "blog" | "news" | "cafe" | "official" | "community" | "other";
}

function classifySource(domain: string): SearchResult["type"] {
  if (domain.includes("blog") || domain.includes("tistory") || domain.includes("brunch")) return "blog";
  if (domain.includes("news") || domain.includes("newswire")) return "news";
  if (domain.includes("cafe.naver")) return "cafe";
  if (domain.includes("place") || domain.includes("map")) return "official";
  return "other";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export class WebSearcher {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async search(query: string): Promise<SearchResult[]> {
    const browser = await this.getBrowser();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      locale: "ko-KR",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await ctx.newPage();

    try {
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ko&num=15`,
        { waitUntil: "networkidle", timeout: 15000 }
      );
      await page.waitForTimeout(1500);

      const rawResults: { url: string; title: string; snippet: string }[] =
        await page.evaluate(() => {
          const items: { url: string; title: string; snippet: string }[] = [];
          const seen = new Set<string>();

          // 방법 1: h3 태그 기준 검색 결과 찾기
          document.querySelectorAll("h3").forEach((h3) => {
            const link =
              h3.closest("a") || h3.parentElement?.closest("a");
            if (!link) return;
            const href = (link as HTMLAnchorElement).href;
            if (!href || seen.has(href)) return;
            if (href.includes("google.com") || href.startsWith("javascript:")) return;

            let snippet = "";
            const container = h3.closest("div[data-sncf], .g, .tF2Cxc")?.parentElement;
            if (container) {
              const paras = container.querySelectorAll("span, div.VwiC3b, .lEBKkf");
              for (const p of paras) {
                const t = p.textContent?.trim();
                if (t && t.length > 20 && !t.includes(h3.textContent || "")) {
                  snippet = t.slice(0, 300);
                  break;
                }
              }
            }

            seen.add(href);
            items.push({ url: href, title: h3.textContent?.trim() || "", snippet });
          });

          // 방법 2: h3가 없으면 모든 외부 링크 수집
          if (items.length === 0) {
            document.querySelectorAll("a[href^='http']").forEach((a) => {
              const href = (a as HTMLAnchorElement).href;
              const text = a.textContent?.trim();
              if (!href || seen.has(href) || href.includes("google.com") || !text) return;
              seen.add(href);
              items.push({ url: href, title: text, snippet: "" });
            });
          }

          return items.slice(0, 15);
        });

      return rawResults.map((r) => ({
        ...r,
        domain: extractDomain(r.url),
        type: classifySource(extractDomain(r.url)),
      }));
    } finally {
      await page.close();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
