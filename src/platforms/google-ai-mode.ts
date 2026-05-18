import { chromium, type Browser, type Page } from "playwright";
import type { PlatformClient, PlatformResult, PlatformQueryInput } from "./types.js";
import { MentionDetector } from "./mention-detector.js";

const GOOGLE_URL = "https://www.google.com";

export class GoogleAiModeClient implements PlatformClient {
  readonly name = "google-ai-mode" as const;
  private detector: MentionDetector;
  private browser: Browser | null = null;

  constructor() {
    this.detector = new MentionDetector();
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }
    return this.browser;
  }

  private async createPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      viewport: { width: 1920, height: 1080 },
    });
    return await context.newPage();
  }

  async query(input: PlatformQueryInput): Promise<PlatformResult> {
    const startTime = Date.now();

    try {
      const browser = await this.getBrowser();
      const page = await this.createPage(browser);

      // 1. 구글 검색 페이지 열기
      await page.goto(GOOGLE_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // 2. 검색어 입력
      const searchBox = page.locator('textarea[name="q"]');
      await searchBox.fill(input.query);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

      // 3. AI Mode 버튼 찾기 및 클릭
      // Google AI Mode 버튼은 다양한 선택자로 존재할 수 있음
      const aiModeSelectors = [
        'button:has-text("AI Mode")',
        'button:has-text("AI 모드")',
        '[role="button"]:has-text("AI Mode")',
        '[aria-label*="AI"]',
      ];

      let aiModeClicked = false;
      for (const selector of aiModeSelectors) {
        const btn = page.locator(selector).first();
        if ((await btn.count()) > 0) {
          await btn.click();
          await page.waitForTimeout(3000);
          aiModeClicked = true;
          break;
        }
      }

      // 4. AI 응답 추출
      let responseText = "";

      if (aiModeClicked) {
        // AI Mode 응답 대기
        await page.waitForTimeout(2000);

        // AI 응답 컨테이너 찾기
        const aiSelectors = [
          ".ai-answer",
          '[data-ai-mode]',
          ".generated-answer",
          "article",
          ".sorhv",
          ".gHkEdf",
          ".cHaqb",
          ".gyFHaf",
          ".VjDLd",
        ];

        for (const sel of aiSelectors) {
          const el = page.locator(sel).first();
          if ((await el.count()) > 0) {
            const text = await el.textContent();
            if (text && text.length > responseText.length) {
              responseText = text;
            }
          }
        }
      }

      // 5. 전체 페이지 텍스트도 수집 (AI Mode를 못 찾았을 경우 대비)
      if (!responseText) {
        responseText = await page.locator("body").textContent() || "";
        responseText = responseText
          .replace(/\s+/g, " ")
          .slice(0, 10000);
      }

      await page.close();

      const mentions = this.detector.detect(responseText, input.brand);

      return {
        platform: "google-ai-mode",
        query: input.query,
        response: responseText.slice(0, 5000),
        mentions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        platform: "google-ai-mode",
        query: input.query,
        response: "",
        mentions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
