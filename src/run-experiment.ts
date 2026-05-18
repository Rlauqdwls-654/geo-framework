import "dotenv/config";
import { QueryGenerator } from "./query/generator.js";
import { Collector } from "./platforms/collector.js";
import { Storage } from "./tracker/storage.js";
import { Analyzer } from "./tracker/analyzer.js";
import { validateConfig } from "./config.js";
import type { PlatformName, PlatformResult } from "./platforms/types.js";

interface ExperimentConfig {
  brand: string;
  purpose: string;
  experimentName: string;
  platforms: PlatformName[];
}

const EXPERIMENTS: Record<string, ExperimentConfig> = {
  "terminal-espresso": {
    brand: "터미널 에스프레소 하우스",
    purpose: "방문객 증대 및 브랜드 인지도 향상",
    experimentName: "터미널 에스프레소 GEO 1차 실험",
    platforms: ["openai", "gemini", "google-ai-mode"],
  },
  nalizaku: {
    brand: "날리자쿠",
    purpose: "강사 유입 및 학생 유치",
    experimentName: "날리자쿠 GEO 1차 실험",
    platforms: ["openai", "gemini", "google-ai-mode"],
  },
};

async function runExperiment(experimentName: string) {
  const config = EXPERIMENTS[experimentName];
  if (!config) {
    console.error(`❌ 알 수 없는 실험: ${experimentName}`);
    console.log("사용 가능:", Object.keys(EXPERIMENTS).join(", "));
    process.exit(1);
  }

  const phase = (process.argv[3] || "baseline") as "baseline" | "post";

  console.log("━━━ GEO 실험 실행 ━━━");
  console.log(`실험: ${config.experimentName}`);
  console.log(`브랜드: ${config.brand}`);
  console.log(`단계: ${phase === "baseline" ? "📋 배포 전 (베이스라인)" : "📊 배포 후 (측정)"}`);
  console.log(`플랫폼: ${config.platforms.join(", ")}\n`);

  // 1. GEO 쿼리 생성
  console.log("📡 [1/3] GEO 쿼리 생성 중...");
  const generator = new QueryGenerator();
  const generated = await generator.generate({
    brand: config.brand,
    purpose: config.purpose,
  });

  console.log(`\n📂 카테고리: ${generated.categories.join(", ")}`);
  console.log(`🔍 쿼리 ${generated.queries.length}개 생성 완료\n`);

  // 2. AI 플랫폼에 쿼리 전송
  console.log("📡 [2/3] AI 플랫폼 측정 중...\n");
  const collector = new Collector(config.platforms);
  
  // 모든 결과를 저장할 배열
  const allQueryResults: PlatformResult[][] = [];

  for (const query of generated.queries) {
    process.stdout.write(`  "${query.slice(0, 35).padEnd(37)}" `);
    const results = await collector.queryAll({ query, brand: config.brand });
    const platformResults = results.map((r) => r.result);
    allQueryResults.push(platformResults);

    const totalMentions = platformResults.reduce((sum, r) => sum + r.mentions.length, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
    console.log(`📢 ${totalMentions}회 인용 (${totalDuration}ms)`);
  }

  // 3. 결과 저장
  console.log("\n📡 [3/3] 결과 저장 중...");
  const storage = new Storage();

  const session = {
    id: `${experimentName}-${Date.now().toString(36)}`,
    brand: config.brand,
    experimentName: config.experimentName,
    phase,
    date: new Date().toISOString(),
    queries: allQueryResults,
  };

  const filePath = await storage.save(session);
  console.log(`   📁 저장 완료: ${filePath}\n`);

  // 요약
  const platformTotals: Record<string, number> = {};
  for (const queryResults of allQueryResults) {
    for (const pr of queryResults) {
      platformTotals[pr.platform] = (platformTotals[pr.platform] || 0) + pr.mentions.length;
    }
  }

  console.log("━━━ 측정 결과 요약 ━━━");
  for (const [platform, total] of Object.entries(platformTotals)) {
    const icons: Record<string, string> = { openai: "🔵", gemini: "🟢", perplexity: "🟣", "google-ai-mode": "🤖" };
    console.log(`  ${icons[platform] || "❓"} ${platform}: ${total}회 인용`);
  }

  const grandTotal = Object.values(platformTotals).reduce((a, b) => a + b, 0);
  console.log(`\n📈 총 인용: ${grandTotal}회`);

  // 베이스라인이 이미 있으면 리포트 생성
  if (phase === "post") {
    const baseline = await storage.getBaseline(config.brand);
    if (baseline) {
      console.log("\n📊 배포 전후 비교 리포트 생성 중...");
      const analyzer = new Analyzer();
      const report = analyzer.compare(baseline, session);
      const md = analyzer.toMarkdown(report);

      const reportPath = `data/${config.brand}/report_${Date.now().toString(36)}.md`;
      const { writeFile } = await import("node:fs/promises");
      await writeFile(reportPath, md, "utf-8");
      console.log(`   📄 리포트 저장: ${reportPath}`);
      console.log(`\n${md}`);
    } else {
      console.log("\n⚠️ 베이스라인 데이터가 없습니다. 먼저 baseline 단계를 실행해주세요.");
    }
  } else {
    console.log(`\n📋 베이스라인 확보 완료!`);
    console.log(`   → GEO 최적화 콘텐츠를 배포한 후 다음 명령어로 재측정하세요:`);
    console.log(`   npx tsx src/run-experiment.ts ${experimentName} post`);
  }
}

// CLI
const experiment = process.argv[2];
if (!experiment || !EXPERIMENTS[experiment]) {
  console.log("사용법: npx tsx src/run-experiment.ts <실험명> [baseline|post]");
  console.log("\n실험 목록:");
  for (const [key, exp] of Object.entries(EXPERIMENTS)) {
    console.log(`  ${key}: ${exp.experimentName}`);
  }
  process.exit(0);
}

runExperiment(experiment).catch(console.error);
