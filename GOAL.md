# 심심해? 게임 사이트 — 프로젝트 마스터 스펙 (v3)

> **한 줄 요약**: 심심하거나 스트레스받을 때 바로 켜서 즐기는 무료 브라우저 게임 포털.
> 에이전트 파이프라인이 게임을 자동 제작·배포하고, 광고로 수익화한다.
> 로그인 없음 · 설치 없음 · 서버 없음 · 도메인 비용만 발생.

---

## 목차

1. [벤치마크 분석](#1-벤치마크-분석)
2. [포지셔닝 전략](#2-포지셔닝-전략)
3. [전체 시스템 아키텍처](#3-전체-시스템-아키텍처)
4. [에이전트 파이프라인 상세](#4-에이전트-파이프라인-상세)
5. [게임 카탈로그 전체](#5-게임-카탈로그-전체)
6. [기술 스택 & 파일 구조](#6-기술-스택--파일-구조)
7. [디자인 시스템](#7-디자인-시스템)
8. [SEO 아키텍처](#8-seo-아키텍처)
9. [리더보드 & 점수 시스템](#9-리더보드--점수-시스템)
10. [수익화 전략](#10-수익화-전략)
11. [배포 파이프라인](#11-배포-파이프라인)
12. [런치 로드맵](#12-런치-로드맵)
13. [KPI & 성공 기준](#13-kpi--성공-기준)

---

## 1. 벤치마크 분석

### 1-A. 모바일: JindoBlu "Offline Games" (com.JindoBlu.OfflineGames)

| 항목 | 수치 |
|------|------|
| 다운로드 | 1억 회+ |
| 별점 | 4.5 / 447,000+ 리뷰 |
| 게임 수 | 20개 |
| 핵심 게임 | 2048, 수도쿠, 솔리테어, 체스, 틱택토, 스네이크, 단어찾기 |

**사용자가 칭찬하는 것**: 로그인 없음 · 타이머 없음 · 일관된 디자인 · 즉시 실행
**사용자가 불만인 것**: 게임 간 인터스티셜 광고 과다 · 저장 없음 · 난이도 깊이 부족

**우리의 차별화 포인트**:
- 광고 빈도 절제 (5라운드당 1회)
- 난이도를 10단계로 세분화해 저장 없어도 OK
- 한국어 UI 완전 지원

### 1-B. PC 웹 플랫폼 비교

| 사이트 | MAU | 핵심 전략 | 우리에게 주는 교훈 |
|--------|-----|----------|--------------------|
| Poki.com | 1억 | 빠른 로딩 + 모바일 퍼스트 + 게임별 SEO | 게임별 독립 URL 필수 |
| CrazyGames | 1.25억/월 | 개발자 SDK + 카테고리 SEO | `/t/relaxing` 같은 카테고리 URL 구조 |
| crazygames.co.kr | 미공개 | 한국어 로컬라이즈 | 직접 경쟁자, 모니터링 필요 |
| CoolMathGames | 높음 | "학교 안전" 틈새 포지셔닝 | 좁은 포지셔닝이 강력한 충성도 형성 |
| neal.fun | 1,300만/월 | 1인 개발 · 소셜 바이럴 · AdSense+후원 | 작게 시작해도 됨 |
| HTMLGames.com | 중형 | 순수 HTML5 특화 | 우리 모델의 직접 참고 |

**공통 성공 법칙**:
1. 클릭 즉시 실행 (로딩 화면 없음)
2. 로그인 없음
3. 게임별 독립 URL + 최적화된 메타태그
4. "관련 게임" 추천으로 세션 연장
5. 모바일 40%+ 트래픽 대응

---

## 2. 포지셔닝 전략

### 타겟 유저 페르소나

| 페르소나 | 상황 | 원하는 것 | 시간 |
|---------|------|---------|------|
| 직장인 A | 점심 시간 / 퇴근 직전 | 가볍게 스트레스 해소 | 5~10분 |
| 학생 B | 수업 공강 / 시험 전날 회피 | 뇌 끄고 싶음 | 10~20분 |
| 주부 C | 잠깐 짬날 때 | 성취감 있는 간단한 게임 | 5~15분 |
| 야근러 D | 집중력 흐트러질 때 | 빠른 리셋 후 복귀 | 3~5분 |

### 포지셔닝 문장

> "로그인도, 설치도, 생각도 필요 없는 5분짜리 자유."

### 경쟁 우위

- **vs JindoBlu 앱**: 설치 불필요, 모바일 브라우저에서 즉시 가능, 광고 절제
- **vs Poki/CrazyGames**: 한국어 완전 지원, 한국인 정서에 맞는 게임 선택
- **vs 다른 한국 게임 사이트**: 스트레스 해소 · 심심함이라는 명확한 콘셉트 포지셔닝

---

## 3. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Layer 0)                                          │
│  게임 제작 요청 수신 → 에이전트 할당 → 진행 조율 → 배포 트리거   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Layer 1      │ │ Layer 2      │ │ Layer 3      │
│ GAME DESIGN  │ │ GAME BUILD   │ │ QA + VERIFY  │
│ (기획·설계)  │ │ (구현)       │ │ (품질 검증)  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Layer 4      │ │ Layer 5      │ │ Layer 6      │
│ SEO PACK     │ │ DEPLOY       │ │ MONITOR      │
│ (메타/스키마)│ │ (빌드·배포)  │ │ (성과 분석)  │
└──────────────┘ └──────────────┘ └──────────────┘
                        │
                        ↓
              ┌─────────────────┐
              │ Cloudflare Pages│
              │ (정적 호스팅)   │
              │ + Supabase      │
              │ (리더보드 DB)   │
              └─────────────────┘
```

### 데이터 흐름

```
게임 아이디어 (백로그) 
  → [Orchestrator] 우선순위 결정
  → [Game Designer] 스펙 문서 작성
  → [Game Builder] HTML/JS 파일 생성
  → [QA Agent] 기능·성능·저작권 검증
  → [SEO Packager] 메타태그·스키마·썸네일 생성
  → [Deploy Agent] 파일 배치 + 사이트맵 갱신 + Git push
  → [Monitor Agent] 주간 트래픽·오류 리포트
```

---

## 4. 에이전트 파이프라인 상세

### Layer 0 — Orchestrator

| 항목 | 내용 |
|------|------|
| 모델 | Claude Sonnet (균형) |
| 역할 | 전체 파이프라인 조율, 우선순위 결정, 에이전트 호출 |
| 입력 | 게임 백로그 JSON, 현재 사이트 상태 |
| 출력 | 각 에이전트에 대한 작업 명세서 |

**의사결정 기준**:
```
우선순위 점수 = (SEO_검색량 × 0.4) + (제작_난이도_역수 × 0.3) + (수익_잠재력 × 0.3)
```

**Orchestrator 프롬프트 핵심**:
```
당신은 심심해게임 사이트의 게임 제작 파이프라인 오케스트레이터입니다.
백로그에서 다음 제작할 게임을 선택하고, 각 전담 에이전트에게 명세서를 전달하세요.

규칙:
- 저작권 이슈가 있는 게임은 즉시 제외
- 제작 완료 전까지 동일 장르 2개 동시 진행 금지 (일관성 유지)
- QA 불합격 시 Game Builder에게 수정 지시, 2회 실패 시 Orchestrator에 보고
- 매주 월요일: 전주 트래픽 데이터로 우선순위 재계산
```

---

### Layer 1 — Game Designer (장르별 5개 에이전트)

#### 1-A. Stress/Fidget Designer

| 항목 | 내용 |
|------|------|
| 모델 | Claude Haiku (빠름, 창의적 반복) |
| 담당 게임 | 뽁뽁이, 피젯 스피너, 버튼 챌린지, 모래 시뮬레이터, 풍선 |
| 핵심 원칙 | 즉각적 피드백 루프, 소리·진동 효과, 실패 상태 없음 |

**출력 스펙 문서 (예시 - 뽁뽁이)**:
```yaml
game_id: bubble-wrap
display_name: 뽁뽁이
tagline: "터뜨리는 재미, 멈출 수 없는 뽁뽁이"
mechanics:
  - grid: 10×15 버블 그리드
  - interaction: 클릭/터치 → 즉시 팝 애니메이션 + 소리
  - combo: 연속 터뜨리기 시 combo_count 증가 → 점수 배수
  - refill: 모두 터뜨리면 새 그리드 자동 생성 (카운터 +1)
difficulty_levels:
  쉬움: 그리드 8×10, 버블 크기 큼
  보통: 그리드 10×15, 일반 크기
  어려움: 그리드 12×20, 버블 작음, 일부 버블 숨겨짐
  전문가: 버블이 움직임, 터뜨리면 옆 버블 반응
score_system:
  base: 버블 1개 = 10점
  combo_2x: 연속 5개
  combo_3x: 연속 10개
  perfect: 그리드 10초 내 완성 → 보너스 500점
leaderboard: true
session_target: 5~10분
copyright_check: pass (버블랩 팝핑 메카닉은 저작권 없음)
```

#### 1-B. Idle/Clicker Designer

| 모델 | Claude Sonnet (복잡한 밸런싱 계산 필요) |
|------|------|
| 담당 게임 | 농사 게임, 도시 건설, 쿠키 클리커류 |
| 핵심 원칙 | 오프라인 진행 루프, 업그레이드 트리, 숫자 폭발 만족감 |

**아이들 게임 밸런싱 공식**:
```
첫 번째 업그레이드 비용: 기본 수익 × 10 (약 10초 플레이)
두 번째 업그레이드: 기본 수익 × 50
N번째 업그레이드: 기본 수익 × (10 × 3^(N-1))
목표: 첫 업그레이드 60초 내, 전체 진행 15분 내 완주 가능
```

**농사 게임 스펙 핵심**:
```yaml
game_id: simple-farm
acts:
  1단계: 씨앗 클릭 → 자라는 애니메이션 (3초) → 수확 (코인)
  2단계: 코인으로 밭 칸 확장, 씨앗 종류 추가
  3단계: 자동 수확기 업그레이드 (아이들 루프 시작)
  4단계: 시장 판매 → 특수 씨앗 해금
offline_progress: true (최대 2시간치 오프라인 수익 계산)
save: localStorage (세션 간 유지, 계정 불필요)
```

#### 1-C. Puzzle Designer

| 모델 | Claude Sonnet |
|------|------|
| 담당 게임 | 2048류, 스도쿠, 블록 퍼즐, 워들류, 픽셀 색칠 |
| 핵심 원칙 | 난이도 10단계, 충분한 힌트 시스템, 오답 피드백 명확 |

**난이도 설계 원칙**:
```
Level 1~3: 튜토리얼급, 실패 불가에 가까움 (신규 유저 이탈 방지)
Level 4~6: 표준 (일반 사용자의 주 플레이 구간)
Level 7~8: 도전적 (재방문 유도, 리더보드 경쟁 시작)
Level 9~10: 극한 (상위 5% 유저용, 바이럴 "이거 깼다" 공유 유도)
```

#### 1-D. Arcade Designer

| 모델 | Claude Haiku |
|------|------|
| 담당 게임 | 스네이크, 벽돌 깨기, 두더지 잡기, 피하기 게임, 에어하키 |
| 핵심 원칙 | 반응형 컨트롤, 점진적 속도 증가, 즉각 재시작 |

**아케이드 핵심 UX 규칙**:
```
게임오버 → 0.5초 딜레이 → 즉시 재시작 버튼 (광고는 3회 게임오버마다 1회)
최고 기록 갱신 시 파티클 이펙트 + 효과음
레벨업 효과음: 동기부여 유지의 핵심
컨트롤: 키보드(데스크탑) + 스와이프(모바일) 모두 지원
```

#### 1-E. Board/Strategy Designer

| 모델 | Claude Sonnet |
|------|------|
| 담당 게임 | 솔리테어, 체스, 틱택토, 커넥트 포, 오목 |
| 핵심 원칙 | AI 강도 5단계, 2인 로컬 플레이 옵션 |

**체스 AI 구현 접근법**:
```
난이도 1~2: 랜덤 합법적 수 (Stockfish 불필요)
난이도 3~4: Minimax depth 2~3 (순수 JS)
난이도 5: Minimax depth 4 + 기본 opening book
외부 API 의존성 없음 → 정적 사이트에서 완전 동작
```

---

### Layer 2 — Game Builder (기술 유형별 3개 에이전트)

#### 2-A. Vanilla Builder

- **담당**: 피젯/스트레스 해소 게임, 단순 아케이드
- **출력**: 단일 `index.html` (CSS + JS 인라인 또는 같은 폴더 파일)
- **제약**: 외부 CDN 의존성 최소화, 오프라인도 동작해야 함

**표준 게임 파일 구조**:
```
games/
└── bubble-wrap/
    ├── index.html      ← 게임 본체 (SEO 메타 + 광고 슬롯 포함)
    ├── game.js         ← 게임 로직 (순수 JS)
    ├── style.css       ← 게임 전용 스타일
    └── thumb.jpg       ← OG 이미지 (1200×630px)
```

**표준 게임 HTML 템플릿**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- SEO (SEO Packager 에이전트가 채움) -->
  <title>{{GAME_TITLE}} - 무료 브라우저 게임 | 심심해게임</title>
  <meta name="description" content="{{META_DESC}}">
  <meta property="og:title" content="{{OG_TITLE}}">
  <meta property="og:image" content="/games/{{GAME_ID}}/thumb.jpg">
  <link rel="canonical" href="https://{{DOMAIN}}/games/{{GAME_ID}}/">
  <!-- Schema.org (SEO Packager 에이전트가 채움) -->
  <script type="application/ld+json">{{SCHEMA_JSON}}</script>
  <!-- 디자인 시스템 -->
  <link rel="stylesheet" href="/assets/design-system.css">
  <!-- 게임별 스타일 -->
  <link rel="stylesheet" href="style.css">
</head>
<body class="game-page">
  <!-- 상단 광고 슬롯 (AdSense/AdinPlay) -->
  <div class="ad-slot ad-top" id="ad-top"></div>

  <!-- 게임 헤더 -->
  <header class="game-header">
    <a href="/" class="back-btn">← 홈</a>
    <h1 class="game-title">{{GAME_TITLE}}</h1>
    <div class="score-display">
      <span id="score">0</span>
      <span class="best-score">최고: <span id="best-score">0</span></span>
    </div>
  </header>

  <!-- 레벨 선택 (진입 시 표시) -->
  <section class="level-select" id="level-select">
    <div class="difficulty-tabs">
      <button class="diff-btn active" data-diff="easy">쉬움</button>
      <button class="diff-btn" data-diff="normal">보통</button>
      <button class="diff-btn" data-diff="hard">어려움</button>
      <button class="diff-btn" data-diff="expert">전문가</button>
    </div>
    <div class="stage-grid" id="stage-grid">
      <!-- JS로 렌더링: 1~20 스테이지 버튼 -->
    </div>
    <button class="play-btn" id="play-btn">▶ 플레이</button>
  </section>

  <!-- 게임 캔버스 -->
  <main class="game-canvas" id="game-canvas" hidden>
    <!-- 게임별 DOM 또는 Canvas -->
  </main>

  <!-- 사이드 광고 (데스크탑 전용) -->
  <aside class="ad-slot ad-side" id="ad-side"></aside>

  <!-- 리더보드 패널 -->
  <section class="leaderboard-panel" id="leaderboard">
    <div class="lb-tabs">
      <button class="lb-tab active" data-scope="local">내 기록</button>
      <button class="lb-tab" data-scope="korea">🇰🇷 한국</button>
      <button class="lb-tab" data-scope="global">🌍 글로벌</button>
    </div>
    <ol class="lb-list" id="lb-list"></ol>
    <button class="share-score-btn" id="share-btn">내 점수 공유</button>
  </section>

  <!-- 하단 광고 + 관련 게임 -->
  <div class="ad-slot ad-bottom" id="ad-bottom"></div>
  <section class="related-games" id="related-games">
    <!-- 같은 장르 3개 게임 카드 -->
  </section>

  <script src="/assets/leaderboard.js"></script>
  <script src="/assets/ads.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

#### 2-B. Phaser Builder

- **담당**: 물리 기반 게임 (농사, 도시건설, 복잡한 아케이드)
- **Phaser 버전**: 3.x (CDN: jsDelivr)
- **주의**: Phaser 씬 구조 → Scene별 파일 분리 → 게임 로직과 UI 분리

#### 2-C. Canvas/WebGL Builder

- **담당**: 모래 시뮬레이터, 유체 물리, 파티클 헤비 게임
- **기술**: 순수 Canvas 2D API (WebGL은 복잡도 대비 효과 적을 때만)

---

### Layer 3 — QA Agent

| 검증 항목 | 기준 | 자동화 |
|---------|------|--------|
| 저작권 검사 | IP명·캐릭터명·상표 없음 확인 | Claude 텍스트 분석 |
| 성능 | 첫 인터랙션 < 3초 | Lighthouse 헤드리스 |
| 모바일 동작 | 터치 이벤트 정상, 48px 최소 버튼 | 수동 체크리스트 |
| 레벨 완료 가능성 | 모든 난이도 실제 플레이 가능 | 에이전트 시뮬레이션 |
| 광고 슬롯 | id="ad-top/side/bottom" 존재 | HTML 파싱 |
| 메타태그 | title, description, og:image 존재 | HTML 파싱 |
| 리더보드 연동 | leaderboard.js 로드, 점수 전송 함수 존재 | JS 검사 |

**불합격 시 처리**:
```
1회 불합격 → Game Builder에게 수정 요청 (구체적 오류 포함)
2회 불합격 → Orchestrator에 보고, 인간 검토 요청
저작권 의심 → 즉시 중단, 인간 검토 필수
```

---

### Layer 4 — SEO Packager

**입력**: 게임 스펙 문서
**출력**: 완성된 메타태그 블록 + Schema.org JSON-LD + 게임 설명문 (한국어/영어)

**메타태그 생성 규칙**:
```
title: {게임명} - 무료 브라우저 게임 | 심심해 (60자 이하)
description: {게임명}을 지금 바로 무료로 즐기세요. 설치·로그인 없이 바로 플레이 가능한 브라우저 게임. {장르 키워드 2~3개 포함} (150자 이하)
og:title: {게임명} 무료 플레이 - 심심해게임
키워드 우선순위: 게임명 롱테일 → 장르 키워드 → 심심함/스트레스 키워드
```

**Schema.org 템플릿**:
```json
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "{{GAME_TITLE}}",
  "description": "{{GAME_DESC}}",
  "url": "https://{{DOMAIN}}/games/{{GAME_ID}}/",
  "applicationCategory": "Game",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "KRW"
  },
  "genre": ["{{GENRE_1}}", "{{GENRE_2}}"],
  "screenshot": "https://{{DOMAIN}}/games/{{GAME_ID}}/thumb.jpg",
  "inLanguage": "ko",
  "isAccessibleForFree": true,
  "numberOfPlayers": {
    "@type": "QuantitativeValue",
    "minValue": "1",
    "maxValue": "{{MAX_PLAYERS}}"
  }
}
```

**썸네일 생성 규칙**:
- 크기: 1200×630px (OG 표준)
- 내용: 게임 플레이 스크린샷 또는 SVG 일러스트 + 게임명 텍스트 + 장르 태그
- 도구: SVG 직접 생성 (에이전트가 코드로 생성, 외부 의존성 없음)

---

### Layer 5 — Deploy Agent

```
1. 새 게임 파일을 /games/{game_id}/ 에 배치
2. /index.html의 게임 목록 JSON 업데이트
3. /sitemap.xml 재생성 (모든 게임 URL 포함)
4. /games/{category}/index.html 카테고리 페이지 갱신
5. Git commit + push → Cloudflare Pages 자동 배포 트리거
6. Supabase 게임 레지스트리 테이블에 새 게임 레코드 INSERT
```

---

### Layer 6 — Monitor Agent (주간 실행)

**수집 데이터**:
- Cloudflare Pages Analytics (무료, 별도 스크립트 불필요): 페이지별 방문수·LCP
- Supabase 리더보드: 게임별 플레이 수(점수 제출 횟수로 추정)
- Google Search Console: 검색어별 노출·클릭수

**주간 리포트 항목**:
```
1. TOP 5 게임 (세션 수 기준)
2. 이번 주 신규 플레이어 수 (IP 기반 추정)
3. 평균 세션당 게임 수
4. 리더보드 참여율 (점수 제출 / 총 플레이)
5. 오류 발생 게임 목록
6. 다음 주 제작 추천 게임 (검색량 + 현재 부재 게임 기준)
```

---

## 5. 게임 카탈로그 전체

### 우선순위 기준
```
P1 (런칭용, 30일 내): 제작 난이도 낮음 + 검색량 있음 + 스트레스 해소 핵심
P2 (60일 내): 아이들 루프 게임 (세션 시간 확보)
P3 (90일 내): 경쟁/점수 게임 (리더보드 활성화)
P4 (지속): AI 에이전트가 자동 추가
```

### 스트레스 해소 / 피젯 (P1)

| ID | 게임명 | 핵심 메카닉 | 기술 | 복잡도 | 리더보드 |
|----|--------|-----------|------|--------|---------|
| bubble-wrap | 뽁뽁이 | 그리드 버블 팝핑 | Vanilla JS | ★☆☆ | 콤보 점수 |
| fidget-spinner | 피젯 스피너 | 드래그 회전 + 관성 | Canvas | ★★☆ | 최고 RPM |
| button-mash | 버튼 연타 챌린지 | 10초 내 최대 클릭 | Vanilla JS | ★☆☆ | 클릭 수 |
| sand-sim | 모래 시뮬레이터 | Canvas 셀룰러 오토마타 | Canvas | ★★★ | 없음 (탐험형) |
| balloon-pop | 풍선 터뜨리기 | 움직이는 풍선 클릭 | Vanilla JS | ★☆☆ | 터뜨린 수 |
| bubble-shooter | 버블 슈터 | 색 맞춰 버블 제거 | Canvas | ★★☆ | 점수 |
| stress-ball | 스트레스 볼 | 클릭 꾹 누르기 물리 | Canvas | ★★☆ | 없음 |
| typing-destroy | 타이핑 분노 해소 | 단어 입력 시 파괴 | Vanilla JS | ★★☆ | WPM |

### 아이들 / 클리커 (P2)

| ID | 게임명 | 핵심 메카닉 | 기술 | 복잡도 | 저장 |
|----|--------|-----------|------|--------|------|
| simple-farm | 농사 게임 | 씨앗→수확→업그레이드 | Phaser | ★★★ | localStorage |
| city-clicker | 도시 건설 | 건물→임대료→확장 | Phaser | ★★★ | localStorage |
| cookie-clicker | 과자 공장 | 클릭→자동화→승수 | Vanilla JS | ★★☆ | localStorage |
| fish-pond | 물고기 연못 | 먹이→성장→판매 | Phaser | ★★★ | localStorage |
| space-miner | 우주 채굴 | 자원 클릭→업그레이드 | Canvas | ★★★ | localStorage |

> 아이들 게임은 localStorage에 진행 저장 (세션 간 유지, 계정 불필요)

### 퍼즐 / 두뇌 (P1~P2)

| ID | 게임명 | 핵심 메카닉 | 기술 | 복잡도 | 레벨 수 |
|----|--------|-----------|------|--------|---------|
| number-2048 | 숫자 합치기 | 슬라이드 타일 병합 | Vanilla JS | ★★☆ | 무한 |
| sudoku | 스도쿠 | 9×9 숫자 배치 | Vanilla JS | ★★★ | 100개 퍼즐 |
| block-puzzle | 블록 퍼즐 | 7형 블록 배치 | Canvas | ★★☆ | 무한 |
| word-search | 단어 찾기 (한국어) | 그리드에서 단어 찾기 | Vanilla JS | ★★☆ | 50개 퍼즐 |
| pixel-color | 픽셀 색칠 | 번호별 칸 칠하기 | Canvas | ★★★ | 30개 그림 |
| nonogram | 노노그램 | 행/열 힌트 격자 풀기 | Vanilla JS | ★★★ | 50개 퍼즐 |
| memory-flip | 카드 뒤집기 | 짝 찾기 기억 게임 | Vanilla JS | ★☆☆ | 10단계 |
| fifteen-puzzle | 15퍼즐 | 슬라이딩 타일 정렬 | Vanilla JS | ★★☆ | 3단계 크기 |
| crossword-kr | 십자말풀이 (한국어) | 가로세로 낱말 | Vanilla JS | ★★★ | 20개 |

### 아케이드 / 리플렉스 (P3)

| ID | 게임명 | 핵심 메카닉 | 기술 | 복잡도 | 리더보드 |
|----|--------|-----------|------|--------|---------|
| snake-game | 스네이크 | 성장+충돌 | Canvas | ★★☆ | 최고 길이 |
| brick-break | 벽돌 깨기 | 패들+공+벽돌 | Canvas | ★★☆ | 점수 |
| mole-whack | 두더지 잡기 | 타이밍 클릭 | Vanilla JS | ★☆☆ | 잡은 수 |
| dodge-game | 피하기 게임 | 장애물 회피 | Canvas | ★★☆ | 생존 시간 |
| air-hockey | 에어하키 | 물리 패들+퍽 | Canvas | ★★★ | 점수 |
| reflex-test | 반응속도 테스트 | 신호 후 클릭 속도 | Vanilla JS | ★☆☆ | 밀리초 |
| fruit-slice | 과일 슬라이스 | 스와이프로 과일 자르기 | Canvas | ★★★ | 점수 |
| tower-stack | 블록 쌓기 | 낙하하는 블록 타이밍 | Canvas | ★★☆ | 층수 |

### 보드 / 전략 (P3)

| ID | 게임명 | 핵심 메카닉 | 기술 | 복잡도 | 리더보드 |
|----|--------|-----------|------|--------|---------|
| solitaire | 솔리테어 | 클론다이크 카드 | Vanilla JS | ★★★ | 완료 시간 |
| chess-game | 체스 | Minimax AI 5단계 | Vanilla JS | ★★★★ | 승률 |
| tic-tac-toe | 틱택토 | AI or 로컬 2P | Vanilla JS | ★☆☆ | 승률 |
| connect-four | 커넥트 포 | AI or 로컬 2P | Vanilla JS | ★★☆ | 승률 |
| gomoku | 오목 | AI or 로컬 2P | Vanilla JS | ★★★ | 승률 |
| minesweeper | 지뢰찾기 | 논리 추론 | Vanilla JS | ★★★ | 클리어 시간 |

### 한국 특화 게임 (P2~P3, 차별화)

| ID | 게임명 | 콘셉트 | 기술 | 복잡도 |
|----|--------|--------|------|--------|
| hangul-type | 한글 타이핑 | 떨어지는 한글 단어 타이핑 | Vanilla JS | ★★☆ |
| korean-word | 끝말잇기 AI | AI와 끝말잇기 | Vanilla JS | ★★★ |
| number-baseball | 숫자 야구 | 숫자 맞히기 추론 | Vanilla JS | ★★☆ |
| korean-quiz | 한국 상식 퀴즈 | 4지선다 퀴즈 | Vanilla JS | ★★☆ |

> **총 게임 수**: 40개 (P1: 15개, P2: 13개, P3: 12개)

---

## 6. 기술 스택 & 파일 구조

### 기술 선택 기준

| 기술 | 사용 기준 | 이유 |
|------|---------|------|
| Vanilla JS + Canvas | 기본 모든 게임 | 외부 의존성 없음, 빠른 로딩 |
| Phaser 3 (jsDelivr CDN) | 복잡한 물리/씬 관리 필요 시 | 아이들, 농사 등 |
| CSS Animations | 순수 인터랙션 (뽁뽁이 등) | JS 없이도 부드러운 애니메이션 |
| Hugo | 사이트 셸 | 기존 블로그 인프라 재사용, 템플릿 엔진 |
| Cloudflare Pages | 배포 | 무제한 대역폭, 상업 허용, 한국 가까운 CDN |
| Supabase | 리더보드 DB | 무료 티어, JS 클라이언트 측 직접 연결 |

### 전체 파일 구조

```
심심해게임사이트/
│
├── site/                          ← Hugo 사이트 루트
│   ├── hugo.yaml                  ← Hugo 설정
│   ├── content/                   ← 정적 페이지
│   │   ├── _index.md              ← 홈 (게임 목록 허브)
│   │   ├── about.md
│   │   ├── privacy.md             ← AdSense 승인 필수
│   │   └── blog/                  ← SEO 컨텐츠 글
│   ├── layouts/
│   │   ├── index.html             ← 홈 템플릿 (게임 그리드)
│   │   ├── partials/
│   │   │   ├── game-card.html     ← 게임 카드 컴포넌트
│   │   │   ├── ad-slot.html       ← 광고 슬롯
│   │   │   └── leaderboard.html
│   │   └── _default/
│   │       └── single.html        ← 블로그 글 템플릿
│   └── static/
│       ├── assets/
│       │   ├── design-system.css  ← 전역 디자인 토큰
│       │   ├── leaderboard.js     ← Supabase 연동 공통 모듈
│       │   ├── ads.js             ← 광고 로드 + 빈도 제어
│       │   └── share.js           ← 점수 공유 기능
│       ├── games/
│       │   ├── _template/         ← 게임 파일 템플릿
│       │   │   ├── index.html
│       │   │   ├── game.js
│       │   │   └── style.css
│       │   ├── bubble-wrap/
│       │   ├── fidget-spinner/
│       │   ├── simple-farm/
│       │   └── ... (게임별 폴더)
│       ├── icons/                 ← SVG 아이콘
│       ├── manifest.json          ← PWA
│       └── sw.js                  ← Service Worker (오프라인 캐싱)
│
├── agents/                        ← 에이전트 스펙 문서
│   ├── orchestrator.md
│   ├── game-designer/
│   │   ├── stress-fidget.md
│   │   ├── idle-clicker.md
│   │   ├── puzzle.md
│   │   ├── arcade.md
│   │   └── board-strategy.md
│   ├── game-builder/
│   │   ├── vanilla-builder.md
│   │   ├── phaser-builder.md
│   │   └── canvas-builder.md
│   ├── qa-agent.md
│   ├── seo-packager.md
│   ├── deploy-agent.md
│   └── monitor-agent.md
│
├── data/
│   ├── games-registry.json        ← 전체 게임 목록 (ID, 제목, 장르, 상태)
│   └── backlog.json               ← 제작 대기 게임 목록
│
├── _headers                       ← Cloudflare 캐시 설정
├── _redirects                     ← URL 리다이렉트 규칙
└── GOAL.md                        ← 이 파일
```

### Cloudflare `_headers` 설정

```
/games/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=3600

/*.html
  Cache-Control: public, max-age=3600
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### PWA 설정 (`manifest.json`)

```json
{
  "name": "심심해 게임",
  "short_name": "심심해",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#7c3aed",
  "description": "심심할 때 바로 켜는 무료 브라우저 게임 모음",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "categories": ["games", "entertainment"],
  "lang": "ko"
}
```

---

## 7. 디자인 시스템

### 핵심 원칙

1. **일관성**: 모든 게임에 동일한 카드·버튼·폰트 — JindoBlu가 1억 다운을 받은 핵심 이유
2. **모바일 퍼스트**: 48px 최소 터치 타겟, 375px 최소 뷰포트
3. **즉각 반응**: 모든 인터랙션 < 100ms 피드백
4. **차분함 + 활력**: 스트레스 해소 콘셉트에 맞게 파스텔 베이스, 게임 진행 시 채도 상승

### 색상 토큰

```css
/* design-system.css */
:root {
  /* 브랜드 */
  --color-brand: #7c3aed;          /* 보라 (메인) */
  --color-brand-light: #a78bfa;
  --color-brand-dark: #5b21b6;

  /* 배경 */
  --color-bg: #0f0f1a;             /* 다크 네이비 (기본 다크) */
  --color-surface: #1e1e2e;        /* 카드 배경 */
  --color-surface-2: #2a2a3e;      /* 호버 상태 */

  /* 텍스트 */
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;

  /* 장르별 액센트 */
  --color-stress: #34d399;         /* 스트레스 해소 = 민트/그린 */
  --color-idle: #fbbf24;           /* 아이들 = 황금 */
  --color-puzzle: #60a5fa;         /* 퍼즐 = 블루 */
  --color-arcade: #f472b6;         /* 아케이드 = 핑크/네온 */
  --color-board: #a78bfa;          /* 보드 = 보라 */
  --color-korea: #ef4444;          /* 한국 특화 = 레드 */

  /* 상태 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* 라이트 모드 오버라이드 */
  @media (prefers-color-scheme: light) {
    --color-bg: #f8fafc;
    --color-surface: #ffffff;
    --color-surface-2: #f1f5f9;
    --color-text: #1e293b;
    --color-text-muted: #64748b;
  }
}
```

### 타이포그래피

```css
/* 폰트: Noto Sans KR (한국어) + Inter (숫자/영어) — Google Fonts, 무료 */
--font-korean: 'Noto Sans KR', sans-serif;
--font-number: 'Inter', 'Noto Sans KR', sans-serif;

--text-xs: 0.75rem;    /* 12px - 캡션 */
--text-sm: 0.875rem;   /* 14px - 보조 텍스트 */
--text-base: 1rem;     /* 16px - 본문 */
--text-lg: 1.125rem;   /* 18px - 소제목 */
--text-xl: 1.25rem;    /* 20px - 게임 제목 */
--text-2xl: 1.5rem;    /* 24px - 섹션 헤더 */
--text-game-score: 2rem; /* 점수 숫자 전용 */
```

### 게임 카드 컴포넌트

```
┌─────────────────────┐
│  [썸네일 이미지]     │ ← 장르 배경색 그라디언트
│  ████████████████   │
│  ████████████████   │
├─────────────────────┤
│ 🟢 [장르 태그]       │ ← 장르별 색상
│ **게임 제목**        │ ← 굵게
│ 짧은 설명문...       │ ← muted 색상
│                     │
│ [▶ 플레이] [🏆 기록] │ ← CTA 버튼
└─────────────────────┘
```

### 홈 레이아웃 구조

```
┌─────────────────────────────────────────────────┐
│  HEADER: 로고 "심심해?" + 검색 + 다크모드 토글   │
├─────────────────────────────────────────────────┤
│  HERO: "심심하거나 스트레스 받을 때"             │
│  [스트레스해소] [퍼즐] [아이들] [아케이드] [보드] │ ← 장르 필터 탭
├─────────────────────────────────────────────────┤
│  🔥 인기 게임                                    │
│  [카드][카드][카드][카드]  →                     │
├─────────────────────────────────────────────────┤
│  💆 스트레스 해소                                │
│  [카드][카드][카드][카드]  →                     │
├─────────────────────────────────────────────────┤
│  🌾 천천히 즐기기 (아이들)                       │
│  [카드][카드][카드][카드]  →                     │
├─────────────────────────────────────────────────┤
│  [광고 배너]                                     │
├─────────────────────────────────────────────────┤
│  🧩 두뇌 게임                                    │
│  ... (이하 동일 패턴)                            │
├─────────────────────────────────────────────────┤
│  FOOTER: 개인정보처리방침 | 이용약관 | 문의      │
└─────────────────────────────────────────────────┘
```

### 애니메이션 규칙

```css
/* 버튼 호버 */
transition: transform 0.1s ease, background-color 0.1s ease;
&:hover { transform: translateY(-2px); }

/* 게임 카드 호버 */
transition: transform 0.15s ease, box-shadow 0.15s ease;
&:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(124,58,237,0.3); }

/* 점수 업데이트 */
@keyframes score-pop { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }

/* 콤보 이펙트 */
@keyframes combo-flash { 0%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1.2)} 100%{opacity:0;transform:scale(1)} }

/* 페이지 전환: 없음 (정적 사이트, iframe 불필요) */
```

---

## 8. SEO 아키텍처

### URL 구조

```
/                              ← 홈 (게임 그리드 전체)
/games/                        ← 게임 목록 페이지
/games/{game-id}/              ← 개별 게임 페이지
/category/stress-relief/       ← 스트레스 해소 카테고리
/category/puzzle/              ← 퍼즐 카테고리
/category/idle/                ← 아이들 카테고리
/category/arcade/              ← 아케이드 카테고리
/category/board/               ← 보드게임 카테고리
/blog/                         ← SEO 컨텐츠 블로그
/blog/games-when-bored/        ← "심심할 때 게임" 타겟 글
/about/
/privacy/
```

### 핵심 타겟 키워드

| 우선순위 | 키워드 | 의도 | 배치 페이지 |
|---------|-------|------|-----------|
| P0 | 심심할때 게임 | 브라우징 | 홈 |
| P0 | 스트레스 해소 게임 | 브라우징 | /category/stress-relief/ |
| P0 | 무료 브라우저 게임 | 브라우징 | 홈 |
| P1 | 뽁뽁이 게임 | 게임별 | /games/bubble-wrap/ |
| P1 | 2048 게임 무료 | 게임별 | /games/number-2048/ |
| P1 | 스도쿠 무료 온라인 | 게임별 | /games/sudoku/ |
| P1 | 솔리테어 온라인 | 게임별 | /games/solitaire/ |
| P2 | 다운로드 없이 게임 | 브라우징 | 홈, 카테고리 |
| P2 | 직장인 심심할때 | 블로그 | 블로그 글 |
| P2 | 수업시간 할 것 | 블로그 | 블로그 글 |

### 페이지별 SEO 구현 체크리스트

**모든 게임 페이지**:
- [ ] `<title>` 60자 이하, 게임명 포함
- [ ] `<meta description>` 150자 이하, 행동 유도 포함
- [ ] `<link rel="canonical">` 절대 URL
- [ ] OG 태그 (`og:title`, `og:description`, `og:image` 1200×630)
- [ ] `VideoGame` Schema.org JSON-LD
- [ ] `BreadcrumbList` Schema.org
- [ ] 게임 설명 텍스트 200자 이상 (게임 아래 노출)
- [ ] FAQ 섹션 (2~3개 질문) + `FAQPage` Schema.org
- [ ] 관련 게임 3개 내부 링크
- [ ] 로딩 시간 < 3초 (게임은 클릭 시 로드)

**카테고리 페이지**:
- [ ] 카테고리명이 포함된 `<h1>`
- [ ] 200자 이상 카테고리 설명
- [ ] 해당 카테고리 전체 게임 목록
- [ ] `ItemList` Schema.org

### 네이버 SEO 구현

```
1. 네이버 서치어드바이저 (searchadvisor.naver.com)
   - 사이트 등록 + 인증 메타태그 추가
   - sitemap.xml 제출
   - 주간 크롤링 요청

2. 네이버 블로그 (별도 계정)
   - 월 2~4회 게임 소개 포스팅
   - 포스팅 형식: "뽁뽁이 게임 해봤어? 진짜 스트레스 해소됨" + 링크
   - 해시태그: #심심할때 #스트레스해소 #브라우저게임 #무료게임

3. 네이버 지식iN
   - "심심할 때 할 수 있는 게임 추천해주세요" 류 질문에 답변
   - 직접 광고 아닌 자연스러운 추천 형태

4. 네이버 애널리틱스 스크립트 추가
```

### Sitemap 자동 생성 (`/sitemap.xml`)

Deploy Agent가 배포 시마다 자동 재생성:
```xml
<urlset>
  <url><loc>/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>/games/bubble-wrap/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <!-- 게임별 자동 추가 -->
  <url><loc>/category/stress-relief/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <!-- 카테고리 자동 추가 -->
  <url><loc>/blog/games-when-bored/</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
</urlset>
```

---

## 9. 리더보드 & 점수 시스템

### Supabase 스키마

```sql
-- 게임 레지스트리 (Deploy Agent가 INSERT)
CREATE TABLE games (
  id TEXT PRIMARY KEY,              -- 'bubble-wrap'
  title TEXT NOT NULL,
  category TEXT NOT NULL,           -- 'stress', 'idle', 'puzzle', 'arcade', 'board'
  score_type TEXT NOT NULL,         -- 'points', 'time_ms', 'count', 'level'
  score_higher_is_better BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 점수 테이블
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id),
  nickname TEXT NOT NULL,           -- 유저가 입력 (최대 10자)
  score BIGINT NOT NULL,
  country_code CHAR(2),             -- IP GeoIP로 자동 감지 (Cloudflare CF-IPCountry 헤더)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (조회 성능)
CREATE INDEX idx_scores_game_score ON scores(game_id, score DESC);
CREATE INDEX idx_scores_game_country ON scores(game_id, country_code, score DESC);

-- RLS (Row Level Security)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "public_read" ON scores FOR SELECT USING (true);

-- 누구나 삽입 가능 (닉네임 조건: 1~10자, 욕설 필터는 앱 레벨)
CREATE POLICY "public_insert" ON scores FOR INSERT
  WITH CHECK (length(nickname) >= 1 AND length(nickname) <= 10);

-- 수정/삭제 불가 (관리자만)
-- (UPDATE/DELETE 정책 없음 = 불가)
```

### 점수 제출 흐름 (클라이언트 JS)

```javascript
// /assets/leaderboard.js
const SUPABASE_URL = '{{SUPABASE_URL}}';
const SUPABASE_ANON_KEY = '{{SUPABASE_ANON_KEY}}';

async function submitScore(gameId, score, nickname) {
  // 1. 로컬 기록 갱신
  const localKey = `best_${gameId}`;
  const current = parseInt(localStorage.getItem(localKey) || '0');
  if (score > current) localStorage.setItem(localKey, score);

  // 2. 닉네임 저장 (다음 제출 시 재사용)
  localStorage.setItem('player_nickname', nickname);

  // 3. Supabase 제출
  const { error } = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ game_id: gameId, score, nickname })
  });
  return !error;
}

async function fetchLeaderboard(gameId, scope = 'global', limit = 10) {
  let url = `${SUPABASE_URL}/rest/v1/scores?game_id=eq.${gameId}&order=score.desc&limit=${limit}`;
  if (scope === 'korea') url += `&country_code=eq.KR`;

  const res = await fetch(url, {
    headers: { 'apikey': SUPABASE_ANON_KEY }
  });
  return res.json();
}
```

### 점수 공유 기능

```javascript
// /assets/share.js
function shareScore(gameTitle, score, nickname) {
  const text = `${gameTitle}에서 ${score.toLocaleString()}점 달성! 🎮\n심심할 때 같이 해봐 →`;
  const url = `https://{{DOMAIN}}/games/${gameId}/`;

  if (navigator.share) {
    // 모바일 네이티브 공유
    navigator.share({ title: gameTitle, text, url });
  } else {
    // 데스크탑: 클립보드 복사
    navigator.clipboard.writeText(`${text}\n${url}`);
    showToast('클립보드에 복사되었습니다!');
  }
}
```

### 부정 점수 방지 (기본)

- 클라이언트에서 점수 범위 검증 (게임별 이론적 최대값 초과 시 제출 차단)
- 동일 IP + 동일 닉네임 1분 내 5회 이상 제출 시 차단 (Supabase RLS)
- 명백한 치트 점수는 관리자 대시보드에서 삭제 가능

---

## 10. 수익화 전략

### 광고 슬롯 배치 전략

```
게임 페이지 레이아웃 (광고 위치):

[ad-top]        ← 728×90 리더보드 (데스크탑) / 320×50 배너 (모바일)
[게임 헤더]
[레벨 선택] or [게임 캔버스]
[ad-side]       ← 160×600 스카이스크래퍼 (데스크탑만, 게임 우측)
[리더보드]
[ad-bottom]     ← 300×250 직사각형 (모바일/데스크탑 공통)
[관련 게임]
```

**인터스티셜 트리거 로직 (`ads.js`)**:
```javascript
// 5라운드(게임오버)마다 1회 인터스티셜
let roundCount = 0;
function onGameOver() {
  roundCount++;
  if (roundCount % 5 === 0) {
    showInterstitialAd(); // AdinPlay/AdSense 인터스티셜
  }
}

// 리워드 비디오: 유저 자발적 요청 시만
function onClickContinue() {
  showRewardedAd(() => {
    // 콜백: 목숨 1 추가 또는 힌트 제공
    localStorage.setItem(`${gameId}_extra_life`, 'true');
  });
}
```

### 단계별 수익화 로드맵

#### Phase 1 — 승인 확보 (런칭 ~ 3개월)

| 항목 | 내용 |
|------|------|
| 적용 네트워크 | Google AdSense |
| 신청 조건 | 게임 10개 이상, 개인정보처리방침, About, 연락처 |
| 예상 RPM | $0.30~$0.80 (한국 트래픽) |
| 예상 월 수익 | ₩0~50,000 (트래픽 초기) |
| 목적 | 수익보다 AdSense 계정 이력 확보 |

#### Phase 2 — 게임 전용 광고로 업그레이드 (3개월 ~ 6개월, 10K 세션+)

| 항목 | 내용 |
|------|------|
| 적용 네트워크 | AdinPlay (게임 전용) |
| 특징 | 인터스티셜 + 리워드 비디오 + 스킨/테이크오버 |
| 예상 RPM | $2~$5 (AdSense 대비 3~7배) |
| 적용 방법 | AdinPlay SDK JS 1줄 추가, AdSense와 병행 가능 |

| 추가 네트워크 | AppLixir |
|------|------|
| 특징 | 리워드 비디오 전문, GDPR 내장 |
| CPM | $4~$15 |
| 통합 | 순수 JS, 백엔드 불필요 |

#### Phase 3 — 확장 (6개월+, 100K 세션+)

| 채널 | 조건 | 수익 구조 |
|------|------|---------|
| Playwire 헤더 비딩 | 500K+ 페이지뷰/월 | 최고 CPM 입찰 |
| ArmorGames 게임 제출 | 없음 | 75% 수익배분 |
| GamePix 퍼블리셔 | 50K+ 방문/월 | 노출당 수익배분 |
| Ko-fi 후원 버튼 | 없음 | 코어 팬 소액 후원 |
| Amazon Associates | 없음 | 게이밍 주변기기 추천 |

### 수익 시뮬레이션

| 월 세션 | 평균 세션 시간 | 예상 페이지뷰 | AdSense RPM | 예상 월 수익 |
|---------|------------|------------|-------------|------------|
| 1,000 | 8분 | 3,000 | $0.50 | ~$1.5 |
| 10,000 | 8분 | 30,000 | $0.80 | ~$24 |
| 50,000 | 10분 | 175,000 | $2.50 (AdinPlay) | ~$437 |
| 100,000 | 10분 | 350,000 | $3.50 | ~$1,225 |
| 500,000 | 12분 | 1,750,000 | $4.00 | ~$7,000 |

> 리워드 비디오 수익은 별도 (케이스 스터디 기준: 인터스티셜의 약 3배)

### 수익 다변화 우선순위

```
1순위: AdinPlay 인터스티셜 + 리워드 비디오 (핵심)
2순위: Google AdSense 디스플레이 (보조)
3순위: 게임 라이선스 배포 (ArmorGames 등)
4순위: Ko-fi 후원 (장기 팬 관계)
5순위: Amazon 어필리에이트 (블로그 섹션)
```

---

## 11. 배포 파이프라인

### Cloudflare Pages 설정

```
저장소: GitHub private repo
빌드 명령: hugo --minify (또는 없음, 정적 파일 직접)
빌드 출력: public/
커스텀 도메인: [구매 예정 도메인]
```

### Git 브랜치 전략

```
main       ← 프로덕션 (Cloudflare Pages 자동 배포)
develop    ← 통합 테스트
games/*    ← 게임별 개발 브랜치 (에이전트가 생성)
```

### 새 게임 배포 플로우

```
1. Deploy Agent: git checkout -b games/{game-id}
2. 파일 배치: /static/games/{game-id}/
3. games-registry.json 업데이트
4. sitemap.xml 재생성
5. git commit + push
6. PR 생성 → QA Agent 최종 확인
7. main 머지 → Cloudflare 자동 배포 (1~2분)
8. Supabase games 테이블 INSERT
```

### 캐시 무효화 전략

- 게임 파일은 해시된 파일명 사용 (`game.abc123.js`)
- 게임 업데이트 시 파일명 변경 → 자동 캐시 무효화
- `index.html`은 짧은 캐시 (`max-age=3600`)

---

## 12. 런치 로드맵

### Phase 0 — 인프라 구축 (D-7 ~ D-1)

- [ ] GitHub 저장소 생성
- [ ] Cloudflare Pages 연결 + 도메인 설정
- [ ] Supabase 프로젝트 생성 + 스키마 배포
- [ ] Hugo 기본 사이트 구조 설정
- [ ] 디자인 시스템 CSS 작성 (색상 토큰 + 컴포넌트)
- [ ] 게임 HTML 템플릿 작성
- [ ] `leaderboard.js` + `ads.js` 공통 모듈 작성
- [ ] 에이전트 스펙 문서 작성
- [ ] `games-registry.json` 기본 구조 생성

### Phase 1 — MVP 런칭 (D+1 ~ D+30, P1 게임 15개)

**Week 1**: 스트레스 해소 5개
- 뽁뽁이, 버튼 연타, 피젯 스피너, 풍선 터뜨리기, 모래 시뮬레이터

**Week 2**: 퍼즐 5개
- 숫자 합치기(2048류), 기억 카드 뒤집기, 블록 퍼즐, 15퍼즐, 스도쿠(기본)

**Week 3**: 아케이드 5개
- 스네이크, 두더지 잡기, 반응속도 테스트, 피하기 게임, 벽돌 깨기

**Week 4**:
- [ ] Google AdSense 신청
- [ ] 네이버 서치어드바이저 등록
- [ ] Sitemap 제출 (Google Search Console + 네이버)
- [ ] 개인정보처리방침 + About 페이지 완성
- [ ] PWA 설정 (`manifest.json` + Service Worker)

### Phase 2 — 성장 (D+31 ~ D+90)

**D+31~60**:
- P2 게임 13개 추가 (아이들 5개 + 한국 특화 4개 + 보드 4개)
- AdSense 승인 후 AdinPlay 병행 신청
- 네이버 블로그 운영 시작

**D+61~90**:
- 리더보드 글로벌/한국 탭 활성화
- 점수 공유 기능 테스트
- SEO 블로그 글 5편 발행
- Monitor Agent 주간 리포트 시작

### Phase 3 — 확장 (D+91~)

- P3 게임 12개 추가 (에이전트 자동화 비율 증가)
- 10K 세션 달성 시: AdinPlay 전환, AppLixir 추가
- ArmorGames 등 게임 배포 플랫폼 제출
- 100K 세션 달성 시: Playwire 헤더 비딩 검토

---

## 13. KPI & 성공 기준

### 핵심 지표 대시보드

| 지표 | Phase 1 목표 | Phase 2 목표 | Phase 3 목표 |
|------|------------|------------|------------|
| 총 게임 수 | 15개 | 28개 | 40개+ |
| 월 세션 | 1,000+ | 20,000+ | 100,000+ |
| 평균 세션 시간 | 5분+ | 8분+ | 10분+ |
| 게임당 평균 플레이 | 2회+ | 3회+ | 4회+ |
| 리더보드 참여율 | - | 10%+ | 20%+ |
| 월 수익 | ₩0 (승인 대기) | ₩50,000+ | ₩500,000+ |
| 저작권 이슈 | 0건 | 0건 | 0건 |
| LCP (Core Web Vitals) | < 2.5초 | < 2.0초 | < 1.5초 |
| Naver 노출 | 등록 완료 | 10개 키워드 | 50개+ 키워드 |
| Google 색인 | 전체 | 상위 50% | 심심함 클러스터 |

### Monitor Agent 주간 체크리스트

```
매주 월요일 자동 실행:
□ Cloudflare Analytics → TOP 5 게임 + 총 방문수
□ Supabase → 게임별 점수 제출 수 (= 실제 플레이 근사치)
□ Google Search Console → 신규 색인 페이지 수, 클릭수 변화
□ 오류 게임 탐지 → 404, JS 오류, 느린 로딩
□ 다음 주 제작 게임 추천 (백로그 우선순위 재계산)
□ 수익 현황 (AdSense/AdinPlay 대시보드 스크린샷)
```

### 에이전트 생산성 지표

| 지표 | 목표 |
|------|------|
| 게임 1개 제작 소요 시간 | < 2시간 (에이전트 기준) |
| QA 합격률 (1회 시도) | > 80% |
| 에이전트 개입 없이 배포 완료율 | > 90% |
| 주당 신규 게임 출시 수 | 2~3개 |

---

## 비고 & 향후 검토 사항

- 기존 블로그 인프라(Hugo + Cloudflare Pages + 에이전트 파이프라인)와 코드 최대 재사용
- 게임 에셋 용량이 Cloudflare Pages 25MB/파일 초과 시: Cloudflare R2 (무료 10GB) 분리 저장
- 한국 특화 게임 (끝말잇기, 한글 타이핑) 우선 개발 시 검색 차별화 극대화
- 아이들 게임 localStorage 저장 → 향후 선택적으로 Supabase 클라우드 저장 연동 가능
- CrazyGames 개발자 프로그램: 완성된 게임들을 제출하면 역방향 트래픽 유입 가능
- Supabase 프리 티어 비활성화 방지: UptimeRobot 무료 플랜으로 30분마다 핑

---

*v3 | 2026-05-13 | 딥리서치 + 기존 블로그 인프라 분석 기반 고도화*
