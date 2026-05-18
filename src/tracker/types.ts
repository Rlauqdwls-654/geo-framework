import type { PlatformResult } from "../platforms/types.js";

/** 저장된 측정 데이터 */
export interface MeasurementData {
  id: string;
  brand: string;
  experimentName: string;
  phase: "baseline" | "post";
  results: PlatformResult[];
  timestamp: string;
}

/** 분석 리포트 */
export interface AnalysisReport {
  brand: string;
  experimentName: string;
  baselineDate: string;
  postDate: string;
  summary: {
    baseline: BrandMetrics;
    post: BrandMetrics;
    change: BrandMetricsChange;
  };
  platformDetails: PlatformDetailReport[];
}

/** 브랜드별 측정 지표 */
export interface BrandMetrics {
  totalMentions: number;
  platformsWithMentions: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    recommendation: number;
    comparison: number;
  };
}

/** 지표 변화량 */
export interface BrandMetricsChange {
  mentionChange: number; // 절대값
  mentionPercentChange: number; // 퍼센트
  platformCoverageChange: number;
}

/** 플랫폼별 상세 리포트 */
export interface PlatformDetailReport {
  platform: string;
  baselineMentions: number;
  postMentions: number;
  queries: string[];
}
