# GEO (Generative Engine Optimization) 프레임워크 실행 PRD

> 작성일: 2026-05-18
> 상태: 초안

## Product Summary

GEO(Generative Engine Optimization) 프레임워크는 AI 검색 엔진(ChatGPT, Gemini, Perplexity, Google AI Mode)의 답변에 브랜드가 인용되도록 최적화하는 전략적 솔루션이다. 3단계 프로세스(생성→배포→추적)를 통해 브랜드의 AI 가시성을 측정하고 개선한다.

## Problem & Users

### 문제
- AI 검색 엔진이 전통적 SEO와 다른 메커니즘으로 작동함 (Earned Media 선호)
- 브랜드가 AI 답변에 인용되는지 측정/최적화하는 방법론 부재
- 소규모 브랜드일수록 AI 가시성 확보가 어려움

### 타겟 사용자
1. **터미널 에스프레소 하우스** (로컬 카페) - 부산 지역 방문객 증대, 브랜드 인지도 향상
2. **날리자쿠** (B2B 교육 SaaS) - 강사/학생 유입, 투자자 유치
3. **부산 롯데월드** (대형 관광 브랜드) - 조건부 진행

## Goals

### 핵심 목표
- **6월 말까지** GEO 전략 실행 완료 및 보도자료 배포

### 성공 기준
1. 4개 AI 플랫폼에서 타겟 브랜드 인용 빈도 측정 가능한 파이프라인 구축
2. 브랜드별 GEO 적용 전후 인용율 변화 측정
3. 최소 1개 브랜드 보도자료 배포 완료
4. Princeton 논문 기법(통계+인용+Quotation) 적용으로 가시성 +40% 목표

## Non-Goals
- 전통적 SEO 최적화 (키워드/백링크 전략)
- 모든 AI 플랫폼 동시 지원 (4개 플랫폼으로 제한)
- 실시간 모니터링 대시보드 (일/주 단위 배치 분석)

## MVP User Journey

```
1. 사용자가 브랜드 + 목적 입력
2. 시스템이 카테고리 자동 도출 → 타겟 쿼리 생성
3. 4개 AI 플랫폼에 쿼리 실행
4. 응답 수집 및 브랜드 인용 분석
5. 배포 전후 비교 리포트 생성
6. 최종 보도자료 배포
```

## Functional Requirements

### 1. 쿼리 생성 엔진
- 브랜드명 + 목적 입력 → 카테고리 자동 도출
- 카테고리 기반 타겟 쿼리 자동 생성
- 조건: 브랜드 직접 검색이 아닌 카테고리 검색에서 브랜드 등장 유도

### 2. 데이터 수집 파이프라인
- **전략 A - API 자동 수집 (3개)**
  - ChatGPT: OpenAI API
  - Gemini: Google API
  - Perplexity: Perplexity API
- **전략 B - 브라우저 자동화 (1개)**
  - Google AI Mode: Playwright 자동화

### 3. 데이터 저장소
- 플랫폼별/날짜별/쿼리별 저장
- 브랜드 언급 문장 + 전후 문맥 추출
- 맥락 분류 (추천/언급/비교/부정)

### 4. 분석 리포트
- 배포 전후 인용 빈도 비교
- 플랫폼별 인용 패턴 분석
- 브랜드별 종합 리포트

### 5. 보도자료
- Princeton 논문 기반 공통 요소 적용
  - 통계 삽입 (Statistics Addition)
  - 출처 인용 (Cite Sources)
  - 직접 인용문 (Quotation Addition)
  - 유창성 최적화 (Fluency Optimization)

## Locked Technical Inputs
- 언어: TypeScript/Node.js
- 브라우저 자동화: Playwright
- 데이터 저장: 로컬 JSON/파일 기반 (초기), 추후 DB 마이그레이션 고려
- AI API: OpenAI, Google AI, Perplexity API
- 도구: VS Code + Pi Harness

## Technical Direction
- **프로젝트 타입**: 자동화 파이프라인 + 분석 도구
- **런타임**: Node.js + TypeScript
- **API 통합**: OpenAI SDK, Google Generative AI SDK, Perplexity API
- **브라우저 자동화**: Playwright for Google AI Mode
- **데이터 저장**: 로컬 파일 시스템 (초기 MVP), 추후 SQLite/PostgreSQL

## Alternatives Considered
- **Playwright vs Puppeteer**: Playwright 선택 (크로스 브라우저 지원, 안정성)
- **로컬 파일 vs DB**: 초기에는 로컬 파일로 빠른 프로토타이핑 후 DB 마이그레이션
- **전체 저장 vs 필터링 저장**: 일단 전체 저장 후 후처리 분석 (한국어 AI 패턴 미지수)

## Open Questions
- 각 브랜드별 우선순위 및 일정 상세
- API 키 확보 및 비용 예산
- Playwright 서버 호스팅 환경
- 보도자료 배포 채널 (뉴스와이어 vs 직접 배포)
- 브랜드별 콘텐츠 타입 구체화

## References
- Princeton GEO 논문 (KDD 2024): https://arxiv.org/abs/2311.09735
- Toronto대 GEO 논문 (2025): https://arxiv.org/abs/2509.08919
- 상세 기획: GEO_Framework.md
