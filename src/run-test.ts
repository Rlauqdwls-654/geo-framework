import "dotenv/config";
import { QueryGenerator } from "./query/generator.js";
import { Collector } from "./platforms/collector.js";
import { validateConfig } from "./config.js";

/**
 * GEO 풀 테스트 실행기
 * 1. 브랜드 정보로 타겟 쿼리 생성 (Gemini)
 * 2. 생성된 쿼리를 모든 플랫폼에 전송
 * 3. 인용 결과 출력
 */
async function runTest() {
  const missing = validateConfig(["openai", "gemini"]);
  if (missing.length > 0) {
    console.error(`❌ API 키 누락: ${missing.join(", ")}`);
    console.error(".env 파일에 API 키를 설정해주세요.");
    process.exit(1);
  }

  const brand = process.argv[2] || "터미널 에스프레소 하우스";
  const purpose = process.argv[3] || "방문객 증대 및 브랜드 인지도 향상";

  console.log("━━━ GEO Framework 풀 테스트 ━━━\n");
  console.log(`브랜드: ${brand}`);
  console.log(`목적:  ${purpose}\n`);

  // 1단계: GEO 쿼리 생성
  console.log("📡 [1/2] GEO 쿼리 생성 중...");
  const generator = new QueryGenerator();
  const generated = await generator.generate({ brand, purpose });

  console.log(`\n📂 카테고리 (${generated.categories.length}개):`);
  generated.categories.forEach((c) => console.log(`   • ${c}`));

  console.log(`\n🔍 생성된 쿼리 (${generated.queries.length}개):`);
  generated.queries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));

  // 2단계: AI 플랫폼에 쿼리 전송
  console.log(`\n📡 [2/2] AI 플랫폼에 쿼리 전송 중...`);
  console.log(`   (OpenAI + Gemini + Google AI Mode)\n`);

  // Google AI Mode는 느리므로 2개 쿼리만 테스트
  const collector = new Collector(["openai", "gemini", "google-ai-mode"]);
  const testQueries = generated.queries.slice(0, 2);

  const allResults: Record<string, { platform: string; mentions: number; duration: number }[]> = {};

  for (const query of testQueries) {
    console.log(`━━━ 쿼리: "${query}" ━━━`);

    const results = await collector.queryAll({ query, brand });

    for (const { platform, result, durationMs } of results) {
      const icons: Record<string, string> = {
        openai: "🔵", gemini: "🟢", perplexity: "🟣", "google-ai-mode": "🤖",
      };
      const icon = icons[platform] || "❓";
      const status = result.error ? `❌ ${result.error.slice(0, 50)}` : `✅ (${durationMs}ms)`;

      console.log(`  ${icon} ${platform}: ${status}`);

      if (result.mentions.length > 0) {
        console.log(`     📢 브랜드 인용 ${result.mentions.length}회 발견!`);
        result.mentions.slice(0, 3).forEach((m) => {
          const emoji: Record<string, string> = {
            positive: "😊", negative: "😞", recommendation: "⭐", comparison: "🤔", neutral: "😐",
          };
          console.log(`     ${emoji[m.sentiment] || "😐"} [${m.sentiment}] ${m.sentence.slice(0, 80)}...`);
        });
      } else if (!result.error) {
        console.log(`     📭 브랜드 인용 없음 (배포 전 베이스라인)`);
      }

      // 결과 기록
      if (!allResults[query]) allResults[query] = [];
      allResults[query].push({ platform, mentions: result.mentions.length, duration: durationMs });
    }
  }

  // 요약
  console.log("\n━━━ 테스트 요약 ━━━");
  for (const [query, results] of Object.entries(allResults)) {
    console.log(`\n  "${query}"`);
    for (const r of results) {
      const icon: Record<string, string> = { openai: "🔵", gemini: "🟢", perplexity: "🟣", "google-ai-mode": "🤖" };
      console.log(`    ${icon[r.platform] || "❓"} ${r.platform}: ${r.mentions}회 인용 (${r.duration}ms)`);
    }
  }

  console.log("\n━━━ 테스트 완료 ━━━");
}

runTest().catch(console.error);
