import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Collector } from "./platforms/collector.js";
import { Storage } from "./tracker/storage.js";
import { Analyzer } from "./tracker/analyzer.js";
import { validateConfig } from "./config.js";
import type { PlatformName, PlatformResult } from "./platforms/types.js";

interface QuerySet {
  brand: string;
  queries: string[];
  profile: { location: string; category: string; differentiators: string[] };
}

async function main() {
  const phase = (process.argv[2] || "baseline") as "baseline" | "post";

  const missing = validateConfig(["openai", "gemini"]);
  if (missing.length > 0) {
    console.error(`❌ API 키 누락: ${missing.join(", ")}`);
    process.exit(1);
  }

  const data = await readFile(
    join(process.cwd(), "data/터미널 에스프레소 하우스/geo-queries.json"),
    "utf-8"
  );
  const querySet: QuerySet = JSON.parse(data);
  const platforms: PlatformName[] = ["openai", "gemini"];

  console.log("━━━ GEO 측정 ━━━");
  console.log(`브랜드: ${querySet.brand}`);
  console.log(`단계: ${phase === "baseline" ? "📋 배포 전" : "📊 배포 후"}`);
  console.log(`플랫폼: ${platforms.join(", ")}`);
  console.log(`쿼리: ${querySet.queries.length}개\n`);

  const collector = new Collector(platforms);
  const allResults: PlatformResult[][] = [];

  for (let i = 0; i < querySet.queries.length; i++) {
    const query = querySet.queries[i];
    const num = `[${String(i + 1).padStart(2, " ")}/${String(querySet.queries.length).padStart(2, " ")}]`;
    process.stdout.write(`  ${num} "${query.padEnd(25)}" `);

    const results = await collector.queryAll({ query, brand: querySet.brand });
    const platformResults = results.map((r) => r.result);
    allResults.push(platformResults);

    const totalMentions = platformResults.reduce((sum, r) => sum + r.mentions.length, 0);
    const totalSources = platformResults.reduce((sum, r: any) => sum + (r.urls?.length || 0), 0);
    const status = [];
    if (totalMentions > 0) status.push(`📢 ${totalMentions}회`);
    if (totalSources > 0) status.push(`📎 ${totalSources}개 출처`);
    console.log(status.join(" ") || "0회");
  }

  // 저장
  const storage = new Storage();
  const session = {
    id: `terminal-espresso-${Date.now().toString(36)}`,
    brand: querySet.brand,
    experimentName: "터미널 에스프레소 GEO 1차 실험",
    phase,
    date: new Date().toISOString(),
    queries: allResults,
  };
  const filePath = await storage.save(session);
  console.log(`\n📁 저장: ${filePath}`);

  // 요약
  const platformTotals: Record<string, { mentions: number; sources: number }> = {};
  for (const qr of allResults) {
    for (const pr of qr) {
      if (!platformTotals[pr.platform]) {
        platformTotals[pr.platform] = { mentions: 0, sources: 0 };
      }
      platformTotals[pr.platform].mentions += pr.mentions.length;
      platformTotals[pr.platform].sources += (pr as any).urls?.length || 0;
    }
  }

  console.log("\n━━━ 측정 결과 ━━━");
  const icons: Record<string, string> = { openai: "🔵", gemini: "🟢", "google-ai-mode": "🤖" };
  for (const [p, t] of Object.entries(platformTotals)) {
    console.log(`  ${icons[p] || "❓"} ${p}: 📢 ${t.mentions}회 인용 | 📎 ${t.sources}개 출처`);
  }
  const totalM = Object.values(platformTotals).reduce((a, b) => a + b.mentions, 0);
  const totalS = Object.values(platformTotals).reduce((a, b) => a + b.sources, 0);
  console.log(`\n📈 총 인용: ${totalM}회 | 총 출처: ${totalS}개`);

  // 인용 발견된 쿼리 상세 출력
  const flatResults = allResults.flat();
  const mentionResults = flatResults.filter((r) => r.mentions.length > 0);
  if (mentionResults.length > 0) {
    console.log("\n━━━ 인용 상세 ━━━");
    for (const r of mentionResults) {
      console.log(`\n  🔍 "${r.query}" [${r.platform}]`);
      r.mentions.forEach((m) => {
        const emoji: Record<string, string> = { positive: "😊", negative: "😞", recommendation: "⭐", comparison: "🤔", neutral: "😐" };
        console.log(`     ${emoji[m.sentiment] || "😐"} ${m.sentence.slice(0, 100)}`);
      });
    }
  }

  // 출처 상세
  const sourceResults = flatResults.filter((r: any) => r.urls?.length > 0);
  if (sourceResults.length > 0) {
    console.log("\n━━━ 출처 상세 ━━━");
    for (const r of sourceResults) {
      console.log(`\n  📎 "${r.query}" [${r.platform}]`);
      (r as any).urls.forEach((u: string, i: number) => {
        console.log(`     ${i + 1}. ${u}`);
      });
    }
  }

  // 배포 후 리포트
  if (phase === "post") {
    const baseline = await storage.getBaseline(querySet.brand);
    if (baseline) {
      const analyzer = new Analyzer();
      const report = analyzer.compare(baseline, session);
      const md = analyzer.toMarkdown(report);
      const reportPath = `data/${querySet.brand}/report.md`;
      await writeFile(reportPath, md, "utf-8");
      console.log(`\n📄 리포트 저장: ${reportPath}`);
    }
  }
}

main().catch(console.error);
