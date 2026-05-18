import type {
  AnalysisReport,
  BrandMetrics,
  BrandMetricsChange,
  PlatformDetailReport,
  MeasurementData,
} from "./types.js";
import type { MeasurementSession } from "./storage.js";

export class Analyzer {
  /**
   * 측정 세션에서 브랜드 메트릭스를 계산한다.
   */
  private calculateMetrics(session: MeasurementSession): BrandMetrics {
    const allMentions = session.queries.flatMap((queryResults) =>
      queryResults.flatMap((pr) => pr.mentions)
    );

    const platformsWithMentions = new Set(
      session.queries
        .flatMap((qr) => qr)
        .filter((pr) => pr.mentions.length > 0)
        .map((pr) => pr.platform)
    );

    const sentimentBreakdown = {
      positive: allMentions.filter((m) => m.sentiment === "positive").length,
      negative: allMentions.filter((m) => m.sentiment === "negative").length,
      neutral: allMentions.filter((m) => m.sentiment === "neutral").length,
      recommendation: allMentions.filter((m) => m.sentiment === "recommendation").length,
      comparison: allMentions.filter((m) => m.sentiment === "comparison").length,
    };

    return {
      totalMentions: allMentions.length,
      platformsWithMentions: platformsWithMentions.size,
      sentimentBreakdown,
    };
  }

  /**
   * 플랫폼별 상세 리포트를 생성한다.
   */
  private createPlatformDetails(
    baseline: MeasurementSession,
    post: MeasurementSession
  ): PlatformDetailReport[] {
    const platformSet = new Set<string>();

    for (const qr of [...baseline.queries, ...post.queries]) {
      for (const pr of qr) {
        platformSet.add(pr.platform);
      }
    }

    return Array.from(platformSet).map((platform) => {
      const baselineMentions = baseline.queries
        .flatMap((qr) => qr.filter((pr) => pr.platform === platform))
        .flatMap((pr) => pr.mentions).length;

      const postMentions = post.queries
        .flatMap((qr) => qr.filter((pr) => pr.platform === platform))
        .flatMap((pr) => pr.mentions).length;

      const queries = [
        ...new Set([
          ...baseline.queries.map((qr) => qr[0]?.query || ""),
          ...post.queries.map((qr) => qr[0]?.query || ""),
        ]),
      ].filter(Boolean);

      return {
        platform,
        baselineMentions,
        postMentions,
        queries,
      };
    });
  }

  /**
   * 베이스라인과 배포 후 데이터를 비교하는 리포트를 생성한다.
   */
  compare(baseline: MeasurementSession, post: MeasurementSession): AnalysisReport {
    const baselineMetrics = this.calculateMetrics(baseline);
    const postMetrics = this.calculateMetrics(post);

    const mentionChange = postMetrics.totalMentions - baselineMetrics.totalMentions;
    const mentionPercentChange =
      baselineMetrics.totalMentions > 0
        ? Math.round((mentionChange / baselineMetrics.totalMentions) * 100)
        : mentionChange > 0
          ? 100
          : 0;

    const change: BrandMetricsChange = {
      mentionChange,
      mentionPercentChange,
      platformCoverageChange:
        postMetrics.platformsWithMentions - baselineMetrics.platformsWithMentions,
    };

    return {
      brand: baseline.brand,
      experimentName: baseline.experimentName,
      baselineDate: baseline.date,
      postDate: post.date,
      summary: { baseline: baselineMetrics, post: postMetrics, change },
      platformDetails: this.createPlatformDetails(baseline, post),
    };
  }

  /**
   * 분석 리포트를 마크다운 형식으로 변환한다.
   */
  toMarkdown(report: AnalysisReport): string {
    const { brand, experimentName, summary, platformDetails } = report;

    const lines: string[] = [
      `# GEO 리포트: ${brand}`,
      `> 실험: ${experimentName}`,
      `> 베이스라인: ${report.baselineDate.slice(0, 10)} → 배포 후: ${report.postDate.slice(0, 10)}`,
      "",
      "## 📊 인용 변화 요약",
      "",
      `| 지표 | 베이스라인 | 배포 후 | 변화 |`,
      `|------|----------|--------|------|`,
      `| 총 인용 수 | ${summary.baseline.totalMentions} | ${summary.post.totalMentions} | **${summary.change.mentionChange >= 0 ? "+" : ""}${summary.change.mentionChange}** (${summary.change.mentionPercentChange >= 0 ? "+" : ""}${summary.change.mentionPercentChange}%) |`,
      `| 인용 플랫폼 수 | ${summary.baseline.platformsWithMentions} | ${summary.post.platformsWithMentions} | **${summary.change.platformCoverageChange >= 0 ? "+" : ""}${summary.change.platformCoverageChange}** |`,
      "",
      "### 감성 분석",
      "",
      "| 감성 | 베이스라인 | 배포 후 |",
      "|------|----------|--------|",
      `| 😊 긍정 | ${summary.baseline.sentimentBreakdown.positive} | ${summary.post.sentimentBreakdown.positive} |`,
      `| ⭐ 추천 | ${summary.baseline.sentimentBreakdown.recommendation} | ${summary.post.sentimentBreakdown.recommendation} |`,
      `| 😐 중립 | ${summary.baseline.sentimentBreakdown.neutral} | ${summary.post.sentimentBreakdown.neutral} |`,
      `| 🤔 비교 | ${summary.baseline.sentimentBreakdown.comparison} | ${summary.post.sentimentBreakdown.comparison} |`,
      `| 😞 부정 | ${summary.baseline.sentimentBreakdown.negative} | ${summary.post.sentimentBreakdown.negative} |`,
      "",
      "## 🔍 플랫폼별 상세",
      "",
      "| 플랫폼 | 베이스라인 | 배포 후 | 변화 |",
      "|--------|----------|--------|------|",
    ];

    for (const pd of platformDetails) {
      const change = pd.postMentions - pd.baselineMentions;
      const changeStr = change >= 0 ? `+${change}` : `${change}`;
      const icons: Record<string, string> = {
        openai: "🔵", gemini: "🟢", perplexity: "🟣", "google-ai-mode": "🤖",
      };
      lines.push(
        `| ${icons[pd.platform] || "❓"} ${pd.platform} | ${pd.baselineMentions} | ${pd.postMentions} | **${changeStr}** |`
      );
    }

    lines.push("", "### 사용된 쿼리");
    for (const pd of platformDetails) {
      for (const q of pd.queries) {
        lines.push(`- \`${q}\``);
      }
      break; // 중복 방지를 위해 첫 번째 플랫폼의 쿼리만
    }

    lines.push(
      "",
      "---",
      `> 생성일: ${new Date().toISOString().slice(0, 10)}`,
      `> GEO Framework v1.0.0`,
      `> Powered by ${experimentName}`
    );

    return lines.join("\n");
  }
}
