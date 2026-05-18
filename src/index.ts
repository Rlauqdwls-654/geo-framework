import "dotenv/config";
import { QueryGenerator } from "./query/generator.js";
import { validateConfig } from "./config.js";
import type { QueryInput } from "./query/types.js";

export * from "./platforms/types.js";
export * from "./platforms/index.js";
export * from "./query/types.js";
export * from "./query/index.js";
export * from "./tracker/types.js";
export * from "./tracker/index.js";

// ====== 샘플 브랜드 데이터 (테스트용) ======
const samples: QueryInput[] = [
  {
    brand: "터미널 에스프레소 하우스",
    purpose: "방문객 증대 및 브랜드 인지도 향상",
  },
  {
    brand: "날리자쿠",
    purpose: "강사 유입 및 학생 유치",
  },
  {
    brand: "부산 롯데월드",
    purpose: "방문객 증대 및 시즌 프로모션 홍보",
  },
];

async function main() {
  console.log("━━━ GEO Framework v1.0.0 ━━━");
  console.log("Platforms: OpenAI, Gemini, Perplexity, Google AI Mode\n");

  const missing = validateConfig();

  if (missing.length > 0) {
    console.warn(`⚠️  API 키가 설정되지 않음: ${missing.join(", ")}`);
    console.warn("   .env 파일을 생성하고 API 키를 설정해주세요.\n");
    console.log("샘플 브랜드 목록:");
    samples.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.brand} (${s.purpose})`);
    });
    console.log('\n실행: npx tsx src/index.ts "<브랜드명>" "<목적>"');
    return;
  }

  // CLI 인자 처리
  const brandArg = process.argv[2];
  const purposeArg = process.argv[3];

  let inputs: QueryInput[];

  if (brandArg && purposeArg) {
    inputs = [{ brand: brandArg, purpose: purposeArg }];
  } else {
    console.log("CLI 인자가 없어 샘플 데이터로 실행합니다.\n");
    inputs = samples;
  }

  const generator = new QueryGenerator();

  for (const input of inputs) {
    console.log(`\n━━━ ${input.brand} ━━━`);
    console.log(`목적: ${input.purpose}\n`);

    try {
      const result = await generator.generate(input);
      console.log("📂 카테고리:");
      result.categories.forEach((c) => console.log(`   • ${c}`));
      console.log("\n🔍 생성된 GEO 쿼리:");
      result.queries.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
      console.log(`\n⏱ 생성 시간: ${result.generatedAt}`);
    } catch (err) {
      console.error(`❌ 쿼리 생성 실패:`, err);
    }
  }
}

main();
