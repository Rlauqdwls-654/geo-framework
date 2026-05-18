import { chromium, type Browser, type Page } from "playwright";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
const SEARCH_URL = "https://search.naver.com/search.naver";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 수집된 브랜드 정보 */
export interface BrandProfile {
  brand: string;
  nameDescription: string;
  location: string;
  category: string;
  targetCustomers: string[];
  differentiators: string[];
  menuHighlights: string[];
  keywords: string[];
  reviewHighlights: string[];
  searchQueries: string[];
  summary: string;
}

/** 검색 결과 페이지 */
interface ScrapedPage {
  title: string;
  url: string;
  text: string;
  source: "search" | "official" | "review" | "blog";
}

export class BrandResearcher {
  private browser: Browser | null = null;
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.google.apiKey });
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }
    return this.browser;
  }

  private async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "ko-KR",
      viewport: { width: 1920, height: 1080 },
    });
    return await ctx.newPage();
  }

  /**
   * 네이버에서 브랜드 검색 결과를 수집한다.
   */
  private async searchBrand(brand: string): Promise<ScrapedPage> {
    console.log(`   🔍 네이버 검색: "${brand}"`);
    const page = await this.createPage();
    await page.goto(`${SEARCH_URL}?query=${encodeURIComponent(brand)}`, {
      waitUntil: "networkidle",
      timeout: 15000,
    }).catch(() => {});
    await sleep(1000);

    const text = (await page.locator("body").textContent() || "")
      .replace(/\s+/g, " ")
      .slice(0, 8000);

    const title = await page.title();
    await page.close();
    return { title, url: `${SEARCH_URL}?query=${encodeURIComponent(brand)}`, text, source: "search" };
  }

  /**
   * 검색 결과에서 URL을 추출하고 방문한다.
   */
  private async visitUrls(brand: string): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];
    const browser = await this.getBrowser();
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      locale: "ko-KR",
      viewport: { width: 1920, height: 1080 },
    });
    const page = await ctx.newPage();

    // 네이버 검색 결과에서 URL 추출
    await page.goto(`${SEARCH_URL}?query=${encodeURIComponent(brand)}`, {
      waitUntil: "networkidle", timeout: 15000,
    }).catch(() => {});
    await sleep(1000);

    const urls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href && !href.includes("search.naver") && !href.includes("ad."))
        .slice(0, 5);
    });

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
        await sleep(500);
        const text = (await page.locator("body").textContent() || "")
          .replace(/\s+/g, " ")
          .slice(0, 5000);
        const title = await page.title();

        const source: ScrapedPage["source"] =
          url.includes("blog") ? "blog" :
          url.includes("place") || url.includes("review") ? "review" :
          "official";

        pages.push({ title, url, text, source });
      } catch {
        continue;
      }
    }

    await page.close();
    return pages;
  }

  /**
   * 수집된 데이터를 AI로 분석하여 브랜드 프로필을 생성한다.
   */
  /**
   * Gemini API 호출 + 재시도 로직
   */
  private async callGemini(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.3, maxOutputTokens: 4096 },
          });
          const text = response.text;
          if (text) return text;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const msg = lastError.message.toLowerCase();
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand")) {
            const delay = [3000, 6000, 10000][attempt] || 5000;
            await sleep(delay);
            continue;
          }
          if (msg.includes("404") || msg.includes("not found")) break;
          await sleep(2000);
        }
      }
    }
    throw lastError || new Error("Gemini API 호출 실패");
  }

  private async analyze(brand: string, pages: ScrapedPage[]): Promise<BrandProfile> {
    const searchPage = pages.find((p) => p.source === "search");
    const officialPages = pages.filter((p) => p.source === "official");
    const reviewPages = pages.filter((p) => p.source === "review" || p.source === "blog");

    // AI 분석용 텍스트 수집
    const searchText = searchPage?.text.slice(0, 3000) || "";
    const officialText = officialPages.map((p) => p.text.slice(0, 2000)).join("\n").slice(0, 4000);
    const reviewText = reviewPages.map((p) => p.text.slice(0, 1500)).join("\n").slice(0, 3000);

    const prompt = `당신은 브랜드 리서치 전문가입니다. 아래 수집된 데이터를 바탕으로 브랜드 "${brand}"에 대한 프로필을 JSON으로 생성해주세요.

## 검색 결과 텍스트
${searchText}

## 공식 페이지 텍스트
${officialText}

## 리뷰/블로그 텍스트
${reviewText}

## 출력 형식 (반드시 아래 JSON만 출력):
{
  "brand": "${brand}",
  "nameDescription": "브랜드명의 의미나 유래",
  "location": "위치/지역",
  "category": "업종/카테고리",
  "targetCustomers": ["타겟 고객층1", "타겟 고객층2"],
  "differentiators": ["차별점1", "차별점2", "차별점3"],
  "menuHighlights": ["대표 메뉴나 특징1", "대표 메뉴나 특징2"],
  "keywords": ["브랜드를 설명하는 핵심 키워드 5-8개"],
  "reviewHighlights": ["리뷰에서 자주 보이는 표현이나 특징"],
  "searchQueries": ["사람들이 이 브랜드를 검색할 때 쓰는 검색어"],
  "summary": "한 줄 요약"
}`;

    const content = await this.callGemini(prompt);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 추출 실패");

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as BrandProfile;
  }

  /**
   * 브랜드 리서치 전체 파이프라인을 실행한다.
   */
  async research(brand: string): Promise<BrandProfile> {
    console.log(`\n━━━ 브랜드 리서치: ${brand} ━━━\n`);

    // 1. 검색
    console.log("1️⃣  웹 검색 결과 수집");
    const searchResult = await this.searchBrand(brand);

    // 2. URL 방문
    console.log("2️⃣  관련 페이지 방문");
    const pages = await this.visitUrls(brand);
    console.log(`     ${pages.length}개 페이지 방문 완료`);

    // 3. AI 분석
    console.log("3️⃣  AI 분석 중...");
    const profile = await this.analyze(brand, [searchResult, ...pages]);

    return profile;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
