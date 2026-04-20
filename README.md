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
| 추천 결과 | 메뉴명, 리뷰 점수 형태의 매칭 점수, 요약, 영양·건강 인사이트, 주의 문구 |
| 곁들임 | 메인과 어울리는 사이드 4개(같은 요리 계열) |
| 다시 뽑기 | 직전 추천과 겹치지 않게 다시 요청 |
| 외부 링크 | 유튜브 레시피, 근처 맛집(카카오맵), 쿠팡 재료|
| 집밥 | 같은 메뉴 기준으로 레시피 JSON 생성 |

브라우저에서 OpenAI API를 직접 호출합니다. 데모·학습용으로는 편하지만, **API 키가 클라이언트에 포함**되므로 공개 서비스에는 백엔드 프록시를 두는 편이 안전합니다.

## 라이브 데모

- **프로덕션 (Vercel):** [https://savoir-ai-food-picks.vercel.app](https://savoir-ai-food-picks.vercel.app)  

## 로컬에서 실행

```bash
cp .env.example .env
# .env 안에 VITE_OPENAI_API_KEY=... 입력
npm install
npm run dev
```

브라우저는 터미널에 나온 주소(보통 `http://localhost:5173`)로 열면 됩니다. 같은 Wi-Fi의 다른 기기에서는 `http://<이_PC의_LAN_IP>:5173` 으로 접속할 수 있습니다(`vite.config.js`의 `server.host: true`).

### 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_OPENAI_API_KEY` | 예 | OpenAI API 키 |

### API가 실제로 호출됐는지 확인

- 브라우저 **개발자 도구 → Network**에서 `api.openai.com` 요청(예: `chat/completions`)이 뜨면 호출된 것입니다.
- 같은 입력으로 짧은 시간 안에만 다시 누르면 **로컬 캐시**에 맞아 API 없이 나올 수 있습니다. 입력을 바꾸거나 **다시 뽑기**를 쓰면 보통 새로 호출됩니다.

## 빌드

```bash
npm run build
npm run preview
```

## 스택

React 19, Vite, Tailwind CSS v4, OpenAI JS SDK, canvas-confetti.

## 배포 (Vercel)

저장소 루트가 앱 루트입니다. **Root Directory**는 `./` (기본값)로 두면 됩니다.

1. **Environment Variables**에 `VITE_OPENAI_API_KEY` 추가 (Production·필요 시 Preview).
2. **Deploy** 후 **Visit** 또는 **Domains**에서 URL 확인.
3. 키를 바꾼 뒤에는 **Redeploy** 또는 `main`에 푸시해 재빌드 (`VITE_*`는 빌드 시 주입).

### 안정적으로 쓰기 위한 팁

- `.env`는 Git에 올리지 않습니다(`.gitignore`에 포함).
- API 키 변경 후에는 **재배포**해야 반영됩니다.
- Hobby 플랜 한도를 염두에 두고, 공개 전에 한 번 추천·레시피 요청이 되는지 확인합니다.

### README에 배포 링크 넣기

1. Vercel → **Settings → Domains** 또는 배포 완료 화면에서 프로덕션 URL 복사.
2. 이 파일 **「라이브 데모」** 줄의 링크를 `[Pick My Lunch 열기](https://실제주소)` 형식으로 수정.
3. `git add README.md` → `commit` → `push` 하면 GitHub 메인에도 반영됩니다.
