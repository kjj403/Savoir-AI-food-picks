# Pick-My-Lunch

**Pick-My-Lunch**는 **오늘 점심 메뉴는?** 를 고민할 때 쓰는 점메추 웹앱입니다.

날씨·배고픔·기분·함께 먹기(혼밥 / 둘이서 / 여러 명)·예산·요리 종류(한식·중식·일식·양식·아무거나)를 고르면, OpenAI가 한 끼 메뉴를 골라 주고 영양·건강 코멘트, 함께 먹기 좋은 곁들임, 집밥 레시피까지 보여 줍니다. 알레르기·기피 재료, 운동 전후, 영양 포인트(단백질 등)도 반영할 수 있습니다.

## 주요 기능

| 구분 | 설명 |
|------|------|
| 분위기 | 날씨, 배고픔, 기분(기분 최고 ~ 화남·짜증 등), 예산 |
| 함께 먹기 | 혼밥 / 둘이서 / 여러 명 — 인원에 맞는 한 끼·곁들임 힌트 |
| 요리 종류 | 한식·중식·일식·양식·아무거나 중 선택 시 그 계열만 추천 |
| 몸·취향 | 알레르기, 싫어하는 음식·맛, 운동과 한 끼, 영양 포인트 |
| 추천 결과 | 메뉴명, 매칭 점수, 요약, 영양·건강 인사이트, 주의 문구 |
| 곁들임 | 메인과 어울리는 사이드 4개(같은 요리 계열) |
| 다시 뽑기 | 직전 추천과 겹치지 않게 다시 요청 |
| 외부 링크 | 유튜브 레시피, 근처 맛집(카카오맵), 쿠팡 재료 |
| 집밥 | 같은 메뉴 기준으로 레시피 JSON 생성 |

OpenAI 호출은 **Vercel Serverless Function** 에서 처리합니다. API 키는 서버 환경변수에만 존재하고 브라우저 번들에는 포함되지 않습니다. 모든 요청은 Origin 검사 → IP rate limit → Cloudflare Turnstile 봇 검증을 차례로 통과해야 OpenAI에 도달합니다.

## 라이브 데모

- **프로덕션 (Vercel):** [https://savoir-ai-food-picks.vercel.app](https://savoir-ai-food-picks.vercel.app)

## 아키텍처

```
[브라우저]
   │ POST /api/recommend  { values, excludeDish, turnstileToken }
   ▼
[Vercel Serverless Function]
   1. Origin allowlist (Vercel 도메인 + localhost)
   2. IP rate limit (Upstash Redis, 분당 10/일 100)
   3. Cloudflare Turnstile 토큰 검증
   4. 입력 크기·variant 검증
   │
   ▼  OPENAI_API_KEY 는 서버에만
[OpenAI gpt-4o]
```

| 파일 | 역할 |
|------|------|
| `api/recommend.js`, `api/recipe.js` | 공개 엔드포인트 |
| `api/_lib/guards.js` | Origin·rate limit·Turnstile 게이트 |
| `api/_lib/rateLimit.js` | Upstash Redis REST 기반 IP 카운터 |
| `api/_lib/turnstile.js` | Cloudflare siteverify 호출 |
| `api/_lib/validate.js` | 입력 길이/허용값 검증 |
| `api/_lib/prompts.js` | RECO/RECIPE 시스템 프롬프트 & user 프롬프트 빌더 |
| `src/lib/api.js` | 클라이언트 fetch 래퍼 + 토큰 첨부 |
| `src/lib/turnstile.js` | 보이지 않는 Turnstile 위젯 토큰 발급 |

## 로컬에서 실행

```bash
cp .env.example .env
# .env 안에 최소 OPENAI_API_KEY=... 만 채우면 동작합니다.
# (Turnstile·Upstash 비밀이 없으면 로컬에서는 자동 스킵)
npm install
npm run dev
```

브라우저는 터미널에 나온 주소(보통 `http://localhost:5173`)로 열면 됩니다. 같은 Wi-Fi의 다른 기기에서는 `http://<이_PC의_LAN_IP>:5173` 으로 접속할 수 있습니다(`vite.config.js`의 `server.host: true`).

> **참고:** `npm run dev`는 Vite 만 띄우기 때문에 `/api/*` 함수가 동작하지 않습니다. 서버 함수까지 로컬에서 실제로 호출하려면 `vercel dev`(Vercel CLI 필요)를 쓰세요.

### 환경 변수

서버 전용(브라우저 노출 금지). 키 이름에 `VITE_` 접두사를 **붙이지 않습니다.**

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | 예 | OpenAI API 키. `/api/*` 함수에서만 사용 |
| `TURNSTILE_SECRET_KEY` | 권장 | Cloudflare Turnstile 시크릿. 없으면 로컬 dev에서만 자동 스킵 |
| `UPSTASH_REDIS_REST_URL` | 권장 | Upstash Redis REST URL (rate limit 저장소) |
| `UPSTASH_REDIS_REST_TOKEN` | 권장 | Upstash Redis REST 토큰 |
| `ALLOWED_ORIGINS` | 선택 | 추가 허용 Origin (콤마 구분). Vercel 배포 URL은 자동 허용 |
| `RATE_LIMIT_PER_MINUTE` | 선택 | 기본 10 |
| `RATE_LIMIT_PER_DAY` | 선택 | 기본 100 |

클라이언트에 노출되는 변수 (`VITE_` 접두사 필수):

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_TURNSTILE_SITE_KEY` | 권장 | Turnstile 사이트 키(공개용). 없으면 클라이언트는 토큰 없이 요청 → 서버가 거부 |

### API가 실제로 호출됐는지 확인

- 브라우저 **개발자 도구 → Network**에서 `/api/recommend` 또는 `/api/recipe` 가 200으로 떨어지면 정상입니다. `api.openai.com` 호출은 클라이언트에서 직접 일어나지 않습니다.
- 같은 입력으로 짧은 시간 안에 다시 누르면 **로컬 캐시**에 맞아 서버 호출 없이 결과가 나올 수 있습니다. 입력을 바꾸거나 **다시 뽑기** 를 쓰면 새로 호출됩니다.

## 빌드

```bash
npm run build
npm run preview
```

## 스택

React 19, Vite, Tailwind CSS v4, Vercel Serverless Functions, OpenAI SDK (서버), Cloudflare Turnstile, Upstash Redis, canvas-confetti.

## 배포 (Vercel)

저장소 루트가 앱 루트입니다. **Root Directory** 는 `./` (기본값) 로 두면 됩니다. `vercel.json` 의 rewrite 가 `/api/*` 는 함수로, 그 외는 SPA(`index.html`)로 보냅니다.

1. **Settings → Environment Variables** 에 위 표의 키를 등록 (Production 만 체크돼도 충분).
2. Cloudflare Turnstile 에서 widget 생성 → `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` 등록. Hostname 에 본인 Vercel 도메인 추가.
3. Upstash 콘솔에서 Redis DB 생성 → REST URL·Token 등록.
4. **Deploy** 후 **Visit** 으로 동작 확인.
5. 키를 바꾼 뒤에는 **Redeploy** 또는 `main` push 로 재빌드 (env 는 빌드/런타임에 박힙니다).

### 보안 메모

이 프로젝트가 처리하는 보안:

- **API 키 노출 차단**: 클라이언트 번들에 OpenAI 키 없음(`grep sk-proj dist/` 로 0 건 확인 가능).
- **Origin allowlist**: 본인 Vercel 도메인 외에서는 호출 거부 (403).
- **IP rate limit**: 분당 10회 / 일 100회 (Upstash 미설정 시 비활성).
- **Cloudflare Turnstile**: 봇 자동화 차단 (Secret 미설정 시 프로덕션에선 모든 요청 거부, 로컬 dev 에서만 자동 스킵).
- **입력 크기 가드**: `allergies`·`dislikes`·`dish` 등에 길이 상한 → 토큰 비용 폭증 방지.

이걸로 막을 수 없는 것:

- **사람이 직접 Turnstile 통과하고 IP 를 돌려가며 호출**: 최종 안전망은 **OpenAI 대시보드의 월 사용량 한도** 입니다 ([Usage limits](https://platform.openai.com/account/limits)). 반드시 Hard limit 을 설정하세요.
- **`.env` 실수 commit**: `.gitignore` 에 들어 있지만 수동으로 강제 추가하지 않도록 주의. 노출되면 즉시 OpenAI 대시보드에서 키 **Rotate**.

### 안정적으로 쓰기 위한 팁

- `.env` 는 Git 에 올리지 않습니다(`.gitignore` 에 포함).
- 환경변수 변경 후에는 **재배포** 해야 반영됩니다.
- Hobby 플랜 한도를 염두에 두고, 공개 전에 한 번 추천·레시피 요청이 되는지 확인합니다.
