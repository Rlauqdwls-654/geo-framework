import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PlatformResult } from "../platforms/types.js";

export interface MeasurementSession {
  id: string;
  brand: string;
  experimentName: string;
  phase: "baseline" | "post";
  date: string; // ISO 8601
  queries: PlatformResult[][]; // [queryIndex][platformIndex]
}

const DATA_DIR = join(process.cwd(), "data");

/**
 * 측정 데이터를 로컬 JSON 파일로 저장/관리
 */
export class Storage {
  /**
   * 측정 결과를 저장한다.
   */
  async save(session: MeasurementSession): Promise<string> {
    const brandDir = join(DATA_DIR, session.brand);
    await mkdir(brandDir, { recursive: true });

    const filePath = join(
      brandDir,
      `${session.phase}_${session.date.slice(0, 10)}_${session.id.slice(0, 8)}.json`
    );

    await writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
    return filePath;
  }

  /**
   * 저장된 측정 세션을 로드한다.
   */
  async load(filePath: string): Promise<MeasurementSession> {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data) as MeasurementSession;
  }

  /**
   * 특정 브랜드의 모든 측정 데이터를 조회한다.
   */
  async listByBrand(brand: string): Promise<{ file: string; session: MeasurementSession }[]> {
    const brandDir = join(DATA_DIR, brand);
    if (!existsSync(brandDir)) return [];

    const files = await readdir(brandDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const sessions: { file: string; session: MeasurementSession }[] = [];
    for (const file of jsonFiles) {
      try {
        const session = await this.load(join(brandDir, file));
        sessions.push({ file: join(brandDir, file), session });
      } catch {
        // 손상된 파일은 스킵
        continue;
      }
    }

    // 날짜 내림차순 정렬
    return sessions.sort((a, b) => b.session.date.localeCompare(a.session.date));
  }

  /**
   * 특정 브랜드의 베이스라인 데이터를 조회한다.
   */
  async getBaseline(brand: string): Promise<MeasurementSession | null> {
    const sessions = await this.listByBrand(brand);
    return sessions.find((s) => s.session.phase === "baseline")?.session || null;
  }

  /**
   * 특정 브랜드의 배포 후(post) 데이터를 조회한다.
   */
  async getPost(brand: string): Promise<MeasurementSession | null> {
    const sessions = await this.listByBrand(brand);
    return sessions.find((s) => s.session.phase === "post")?.session || null;
  }

  /**
   * 모든 브랜드 목록을 조회한다.
   */
  async listBrands(): Promise<string[]> {
    if (!existsSync(DATA_DIR)) return [];
    const entries = await readdir(DATA_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }
}
