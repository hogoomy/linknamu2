# 우리집 플래너 (가칭) — 기획서 & 개발 프롬프트

## 1. 한 줄 정의
부부 두 사람이 **달력 화면 하나에서** 일정을 보고 "언제 무엇을 할지" 정하고,
서로에게 하는 부탁·요청을 **체크 가능한 할 일**로 주고받는 앱.
PC 브라우저와 휴대폰(홈 화면 설치형 앱, PWA) 모두에서 같은 데이터를 실시간으로 본다.

## 2. 사용자 & 핵심 시나리오
- 사용자: 나, 아내 — 딱 2명 (하나의 "커플 공간"을 공유)
- 시나리오
  1. 달력을 열면 이번 달 일정과 날짜별 할 일 개수가 한눈에 보인다.
  2. 날짜를 누르면 그날의 일정 + 할 일 목록이 아래 시트로 열린다.
  3. "토요일까지 세탁소 들러줘" → 할 일 생성, **요청한 사람 / 받는 사람 / 마감일** 지정.
  4. 받은 사람 휴대폰에 알림 → 수락/완료 체크 → 요청한 사람에게 완료 알림.
  5. 마감일 없는 할 일은 "언제 할까?" 보관함에 있다가 달력 날짜로 끌어다 놓아 일정 확정.

## 3. 기능 범위

### MVP (1차)
| 영역 | 기능 |
|---|---|
| 계정 | 이메일 매직링크 또는 구글 로그인, 초대 코드로 배우자 연결 (커플 공간 1개) |
| 달력 | 월간 보기(기본) / 주간 보기, 날짜별 일정·할 일 점 표시, 오늘 강조 |
| 일정 | 제목, 날짜·시간(종일 가능), 담당(나/아내/함께), 색상, 메모 |
| 할 일 | 제목, 요청자 → 담당자, 마감일(선택), 상태: 요청됨 → 진행중 → 완료, 체크박스로 완료 |
| 탭 | ① 달력 ② 할 일(내가 받은 요청 / 내가 한 요청 / 함께) ③ 설정 |
| 동기화 | 상대가 추가·체크하면 새로고침 없이 즉시 반영 (실시간) |
| 모바일 | PWA: 홈 화면 추가, 전체화면 실행, 앱 아이콘, 오프라인에서 마지막 화면 보기 |
| 알림 | 새 요청 받음, 내 요청 완료됨, 마감 당일 아침 알림 (Web Push) |

### 2차
- 반복 일정/할 일 (매주 분리수거 등), 구글 캘린더 가져오기(읽기 전용)
- 할 일에 댓글/이모지 반응, 사진 첨부(영수증 등)
- 장보기 목록 템플릿, 기념일 D-day

### 만들지 않을 것
- 2명 초과 그룹, 팀 기능, 복잡한 권한 관리

## 4. 필요한 프로그램 / 기술 스택

| 구분 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | **Next.js 16 (App Router) + TypeScript** | 기존 링크나무에서 이미 써 봄. 웹 하나로 PC·모바일 모두 해결 |
| 스타일 | **Tailwind CSS v4** | 모바일 우선 반응형 빠르게 |
| 앱처럼 설치 | **PWA** (`app/manifest.ts` + Service Worker) | 앱스토어 없이 홈 화면 아이콘으로 설치. iOS 16.4+에서 푸시 가능(홈 화면 설치 필수) |
| DB·로그인·실시간 | **Supabase** (Postgres + Auth + Realtime + RLS) | 두 사람 간 실시간 동기화가 핵심 → 구독 기능 내장. 무료 티어로 충분. RLS로 "우리 커플 데이터만" 보장 |
| 달력 UI | **date-fns** + 직접 만든 월간 그리드 (대안: FullCalendar) | 모바일에서 손가락으로 쓰기 좋은 커스텀 UI가 유리 |
| 드래그 | **dnd-kit** (2차) | 보관함 → 날짜로 끌어 놓기 |
| 푸시 알림 | **web-push** (VAPID) + Supabase Edge Function / Vercel Cron | 요청·완료·마감 알림 |
| 배포 | **Vercel** | Git push → 자동 배포, HTTPS(PWA 필수 조건) 기본 제공 |
| 테스트 | **Playwright** (모바일 뷰포트 E2E) | "요청 → 체크 → 상대 화면 반영" 흐름 검증 |

> MongoDB(링크나무에서 사용)도 가능하지만 실시간 동기화·로그인·권한을 직접 구현해야 해서 Supabase 추천.

### 준비물 (계정)
- GitHub 새 저장소, Vercel 계정, Supabase 프로젝트
- 환경 변수(`.env.local`, 커밋 금지): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

## 5. 데이터 모델 (Supabase / Postgres)
```
profiles     (id = auth.users.id, name, color, avatar_url, couple_id)
couples      (id, invite_code, created_at)
events       (id, couple_id, title, starts_at, ends_at, all_day, owner: 'me'|'partner'|'both' → user_id|null, color, memo)
tasks        (id, couple_id, title, requester_id, assignee_id|null(함께), due_date|null,
              status: 'requested'|'in_progress'|'done', done_at, memo, created_at)
push_subscriptions (id, user_id, endpoint, p256dh, auth)
```
- 모든 테이블 RLS: `couple_id = (select couple_id from profiles where id = auth.uid())`

## 6. 화면 구성
1. **달력(홈)**: 상단 월 이동 / 월간 그리드(날짜마다 일정 색 점 + 할 일 개수 배지) / 날짜 탭 → 하단 시트(그날 일정·할 일, "+ 추가")
2. **할 일**: 세그먼트 탭 [받은 요청 | 보낸 요청 | 함께] , 체크박스, 마감 임박 순 정렬, 날짜 없는 할 일 "언제 할까?" 섹션
3. **추가 시트**: 종류 토글 [일정 | 할 일] → 할 일이면 "누구에게?" (아내/나/함께) 선택
4. **설정**: 내 이름·색, 배우자 초대 코드, 알림 켜기, 홈 화면 설치 안내
- 하단 탭바 + 오른쪽 아래 떠있는 "+" 버튼, 엄지 닿는 위치 우선 / PC는 왼쪽 달력 + 오른쪽 할 일 2단

## 7. 개발 단계
1. 프로젝트 생성, Tailwind, Supabase 연결, 로그인
2. 커플 공간 생성 + 초대 코드 연결
3. 달력 월간 뷰 + 일정 CRUD
4. 할 일 CRUD + 요청/담당 + 체크 + 달력 연동
5. Realtime 구독으로 실시간 반영
6. PWA (manifest, 아이콘, service worker, 설치 안내)
7. Web Push 알림
8. Playwright E2E, Vercel 배포

## 8. Claude Code에서 쓸 스킬 / 도구
| 스킬·도구 | 언제 |
|---|---|
| `frontend-design` | 달력·할 일 화면의 디자인 방향(따뜻한 커플 앱 톤) 잡을 때 |
| `design:ux-copy` | 버튼 문구, 빈 화면 문구("아직 부탁한 일이 없어요") |
| `design:accessibility-review` | 터치 영역·대비 점검 |
| `run` | 개발 서버 띄우고 모바일 화면 스크린샷으로 확인 |
| `code-review`, `security-review` | 기능 완료마다 버그·RLS/권한 점검 |
| Playwright(설치됨) | 두 브라우저 컨텍스트로 "남편 요청 → 아내 체크" 시나리오 테스트 |
| GitHub MCP | 커밋·PR 관리 |
| Google Calendar 커넥터 (선택) | 2차 기능 "구글 캘린더 가져오기" 개발 시 실제 데이터로 확인 |

---

## 9. 개발용 프롬프트 (Claude Code에 그대로 붙여넣기)

```
부부 2명이 일정과 할 일을 공유하는 웹앱 "우리집 플래너"를 만들어줘.

[목적]
- 달력 화면에서 언제 무엇을 할지 결정한다.
- 서로에게 하는 부탁/요청을 '할 일'로 보내고, 받은 사람이 체크해서 완료한다.
- PC 브라우저와 휴대폰 모두에서 쓰며, 휴대폰에서는 홈 화면에 설치해 앱처럼 쓴다(PWA).

[기술 스택]
- Next.js 16 App Router + TypeScript + Tailwind CSS v4
  (이 버전은 학습 데이터와 다를 수 있으니 node_modules/next/dist/docs 의 가이드를 먼저 읽을 것)
- Supabase: Auth(이메일 매직링크 + 구글), Postgres, Realtime, RLS
- date-fns로 직접 만든 월간/주간 달력 컴포넌트
- PWA: app/manifest.ts, 아이콘(192/512, maskable), service worker(오프라인 셸 캐시)
- web-push(VAPID)로 푸시 알림
- 배포: Vercel / 테스트: Playwright

[데이터 모델]
profiles(id, name, color, avatar_url, couple_id)
couples(id, invite_code)
events(id, couple_id, title, starts_at, ends_at, all_day, owner_id|null(함께), color, memo)
tasks(id, couple_id, title, requester_id, assignee_id|null(함께), due_date|null,
      status requested|in_progress|done, done_at, memo, created_at)
push_subscriptions(id, user_id, endpoint, p256dh, auth)
모든 테이블에 RLS: 같은 couple_id 사용자만 읽기/쓰기. 마이그레이션 SQL 파일로 작성.

[화면]
1. 달력(홈): 월 이동, 날짜마다 일정 색 점 + 할 일 개수 배지, 날짜 탭 시 하단 시트에 그날 일정/할 일, '+' 추가
2. 할 일: [받은 요청 | 보낸 요청 | 함께] 탭, 체크박스 완료, 마감 임박순, 날짜 없는 할 일은 '언제 할까?' 섹션
3. 추가 시트: [일정 | 할 일] 토글, 할 일은 '누구에게?'(배우자/나/함께)와 마감일 선택
4. 설정: 이름·색, 배우자 초대 코드 생성/입력, 알림 켜기, 홈 화면 설치 안내(iOS/안드로이드)
- 모바일: 하단 탭바 + 플로팅 '+' 버튼, 터치 영역 44px 이상
- PC(≥1024px): 왼쪽 달력, 오른쪽 할 일 목록 2단 레이아웃
- 상대방이 추가/체크하면 Supabase Realtime으로 즉시 반영

[알림]
- 새 요청을 받으면, 내가 보낸 요청이 완료되면, 마감 당일 오전 8시(Asia/Seoul)에 푸시

[규칙]
- 컴포넌트는 src/components, Supabase 클라이언트는 src/lib
- 비밀값은 .env.local (커밋 금지), .env.example 제공
- 모바일 우선, 한국어 UI, 날짜는 Asia/Seoul 기준

[진행 방식]
아래 순서로 단계마다 동작 확인 후 커밋:
1) 세팅+로그인 2) 커플 연결 3) 달력+일정 4) 할 일+요청 5) 실시간 6) PWA 7) 푸시 8) E2E 테스트+README(배포 방법)
각 단계 끝에 모바일 뷰포트 스크린샷으로 화면을 확인해줘.
```
