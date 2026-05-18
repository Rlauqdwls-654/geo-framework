import "dotenv/config";
import { GeoPlanner } from "./research/geo-planner.js";
import type { BrandProfile } from "./research/brand-researcher.js";

async function main() {
  const brand = "터미널 에스프레소 하우스";

  const profile: BrandProfile = {
    brand,
    nameDescription: "정통 에스프레소 바 카페",
    location: "사당, 강서, 언더그라운드 (3개 지점)",
    category: "카페/에스프레소 바",
    targetCustomers: ["직장인", "주부", "일반 카페 이용객"],
    differentiators: ["정통 에스프레소", "맛있는 디저트"],
    menuHighlights: ["에스프레소", "디저트"],
    keywords: ["카페", "에스프레소", "디저트", "사당 카페", "강서 카페"],
    reviewHighlights: ["에스프레소가 맛있어요", "디저트가 맛있어요"],
    searchQueries: ["사당 카페", "강서 카페 추천"],
    summary: "사당/강서/언더그라운드에 위치한 정통 에스프레소와 맛있는 디저트가 특징인 에스프레소 바 카페",
  };

  console.log(`\n━━━ GEO 검색어 15개: ${brand} ━━━\n`);

  const planner = new GeoPlanner();
  const plan = await planner.plan(profile);

  plan.queries.forEach((q, i) => {
    const num = String(i + 1).padStart(2, " ");
    console.log(`  ${num}. "${q.query}"`);
  });

  console.log(`\n━━━ 총 ${plan.totalQueries}개 ━━━`);
}

main().catch(console.error);
