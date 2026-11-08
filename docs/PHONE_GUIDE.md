# 📱 휴대폰만으로 배포하기

컴퓨터 없이 휴대폰 브라우저(Safari/Chrome)와 Claude 앱만으로 끝내는 순서입니다.
코드 작성·수정·커밋은 Claude 앱에서 말로 요청하고, 사람은 **계정 연결과 버튼 클릭**만 합니다.

## 0. 준비 (5분)
- GitHub, Vercel 계정 (Vercel은 "Continue with GitHub"로 가입하면 연결까지 한 번에)
- 휴대폰 브라우저를 **데스크톱 모드**로 보면 GitHub·Vercel·Supabase 화면이 덜 잘려요 (Safari: 주소창 `가가` → 데스크톱 웹사이트 요청)

## 1. GitHub 저장소 만들기 (2분)
1. 브라우저에서 github.com/new 접속
2. Repository name: `couple-planner`, Private 선택, **README 추가 체크 해제**
3. Create repository → Claude 앱에 "저장소 만들었어" 라고 말하기 → Claude가 코드를 올림

## 2. Vercel에 배포 + Supabase 자동 연결 (5분)
1. vercel.com/new → `couple-planner` 저장소 **Import** → Deploy
   (환경 변수 없이도 데모 모드로 바로 열려요. 주소 예: `couple-planner-xxx.vercel.app`)
2. 프로젝트 → **Storage** 탭 → Create Database → **Supabase** 선택 → 지역 `Seoul (ap-northeast-2)` → 생성
   → Supabase 주소/키 환경 변수가 프로젝트에 자동으로 들어갑니다
3. Settings → **Environment Variables** 에 Claude가 준 `vercel-env-values.txt`의 4줄을 추가
   (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`)
   - Vercel의 환경 변수 화면은 여러 줄 `.env` 붙여넣기를 지원해서 한 번에 넣을 수 있어요

## 3. DB 테이블 만들기 (3분)
1. GitHub 앱/웹에서 저장소의 `supabase/migrations/0001_init.sql` 열기 → **Raw** → 전체 선택·복사
2. Vercel Storage 탭의 Supabase → **Open in Supabase** → 왼쪽 메뉴 **SQL Editor** → 붙여넣기 → **Run**
   - "Success. No rows returned" 가 나오면 성공
   - 같은 방법으로 `0002_cover_photo.sql` 도 실행 (커버 사진)
3. Supabase → **Authentication → URL Configuration**
   - Site URL: `https://<내 vercel 주소>`
   - Redirect URLs: `https://<내 vercel 주소>/**` 추가
   (이걸 안 하면 로그인 메일 링크가 localhost로 가요)
4. Supabase → **Authentication → Emails → Magic Link** 템플릿 본문 맨 아래에 한 줄 추가 → Save
   ```
   <p>로그인 코드: <b>{{ .Token }}</b></p>
   ```
   (홈 화면 앱 안에서 이 코드를 입력해 로그인해요)

## 3-1. 구글 캘린더 연결 (선택, 5분)
1. console.cloud.google.com → 새 프로젝트 → **API 및 서비스 → 라이브러리** → `Google Calendar API` 사용 설정
2. **OAuth 동의 화면**: 외부 → 앱 이름 `우리집 플래너` → 테스트 사용자에 두 사람 구글 메일 추가
3. **사용자 인증 정보 → OAuth 클라이언트 ID** → 웹 애플리케이션
   → 승인된 JavaScript 원본: `https://<내 vercel 주소>`
4. 만들어진 클라이언트 ID를 Vercel 환경 변수 `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 로 추가
5. 앱 설정 → **구글 캘린더 연결하기** (각자 자기 기기에서 한 번)

## 4. 다시 배포 (1분)
Vercel → Deployments → 맨 위 ⋯ → **Redeploy** (환경 변수를 넣은 뒤엔 꼭 한 번)
→ 상단에 '데모' 배지가 사라지면 실제 서버 모드

## 5. 두 사람 설치 (각자 2분)
1. 휴대폰 Safari(아이폰)/Chrome(안드로이드)로 Vercel 주소 접속
2. 공유(⬆︎) → **홈 화면에 추가** → 홈 화면 아이콘으로 열기
3. 홈 화면 앱에서 이메일 입력 → 메일에 온 **숫자 코드**를 앱에 입력
   - 메일의 링크를 누르면 Safari에서 로그인돼요. 아이폰은 Safari와 홈 화면 앱의 로그인이 따로라서, 앱에서는 코드를 쓰세요
4. 한 사람: **공간 만들기** → 초대 코드를 카톡으로 전송
   다른 사람: **초대 코드가 있어요** → 코드 입력
5. 설정 → **이 기기에서 알림 받기**

## 이후 수정하고 싶을 때
Claude 앱에서 "할 일에 사진 첨부 기능 추가해줘" 처럼 말하면 → Claude가 코드 수정·푸시 → Vercel이 자동 배포 → 휴대폰 앱을 껐다 켜면 반영
