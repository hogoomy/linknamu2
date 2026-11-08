# 우리집 플래너

둘이 함께 쓰는 달력과 할 일 앱입니다. 달력에서 언제 무엇을 할지 정하고, 서로에게 하는 부탁을 할 일로 보내 체크해요.
PC 브라우저에서도 쓰고, 휴대폰에서는 홈 화면에 추가하면 앱처럼 열려요(PWA).

## 주요 기능
- 월간/주간 달력: 날짜마다 일정 색 표시(내 색 / 상대 색 / 함께), 남은 할 일 개수 배지
- 날짜를 누르면 그날 일정과 할 일, 날짜가 정해지지 않은 '언제 할까?' 목록 → **이 날 하기**로 일정 확정
- 할 일·부탁: 누가 할지(상대 / 나 / 함께), 마감일, 메모, 상태(부탁함 → 진행 중 → 완료), 받은 사람은 **할게요**로 수락
- 할 일 탭: 내 할 일 / 부탁한 일 / 함께
- 실시간 동기화: 상대가 추가하거나 체크하면 새로고침 없이 바로 보임
- 푸시 알림: 새 부탁 받음, 내 부탁 완료됨, 마감 당일 오전 8시
- 구글 캘린더: 내 구글 일정을 달력에 회색으로 함께 표시(읽기 전용), 앱 일정은 '구글 캘린더에도 추가'
- 사진 달력: 달마다 다른 커플 사진 + 손글씨 월 숫자 (여러 장 고르면 이번 달부터 차례로), 좌우로 밀어 달 이동
- 날짜를 누르면 그 날 일정·할 일 팝업
- 초대 코드로 배우자 연결, 다크 모드, 토스풍 디자인

## 바로 써보기 (데모 모드)
환경 변수 없이 실행하면 데이터가 브라우저에만 저장되는 데모 모드로 열립니다.

```bash
npm install
npm run dev
```

http://localhost:3000 을 탭 두 개로 열고, 한 탭에서 **설정 → 아내(으)로 보기**를 누르면 두 사람이 쓰는 흐름을 확인할 수 있어요.

## 실제로 쓰기 (Supabase + Vercel)
1. **Supabase** 프로젝트 생성 → SQL Editor에 `supabase/migrations/` 의 SQL 파일을 번호 순서대로 붙여넣고 실행
2. Supabase → Authentication → URL Configuration 의 Site URL / Redirect URL에 배포 주소 추가
3. 푸시 키 만들기: `npx web-push generate-vapid-keys`
4. `.env.example`을 `.env.local`로 복사해서 값 채우기 (Vercel에는 Project Settings → Environment Variables에 같은 값)
5. **Vercel**에 이 저장소를 연결해 배포. `vercel.json`의 Cron이 매일 08:00(KST)에 마감 알림을 보냅니다 (`CRON_SECRET` 필요)
6. (선택) 구글 캘린더: `docs/PHONE_GUIDE.md` 3-1 단계대로 OAuth 클라이언트 ID 발급 → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
7. 두 사람 모두 휴대폰에서 접속 → 홈 화면에 추가 → 설정에서 **이 기기에서 알림 받기**
   - 아이폰은 반드시 홈 화면 아이콘으로 열어야 알림을 받을 수 있어요 (iOS 16.4+)

## 구조
```
src/app/            페이지, manifest, API(/api/push, /api/cron/reminders)
src/components/     화면 컴포넌트 (App, Calendar, DayPanel, TasksView, Editor, Settings, Onboarding)
src/lib/backend/    데이터 계층: supabase.ts(실서버) / demo.ts(브라우저 저장)
supabase/migrations 테이블, RLS(같은 커플만 접근), 초대 코드 함수, 실시간 설정
public/sw.js        서비스 워커 (오프라인 화면, 푸시)
docs/PLAN.md        기획서
tests/e2e-demo.js   Playwright 데모 모드 시나리오 테스트
```

## 테스트
```bash
npm run build && npm start      # 다른 터미널에서
BASE_URL=http://localhost:3000 node tests/e2e-demo.js /tmp
```
