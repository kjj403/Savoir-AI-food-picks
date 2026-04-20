# Savoir

**Savoir**는 분위기(날씨·배고픔·무드·예산)에 맞춰 GPT-4o로 한 끼를 추천하고, 영양·건강 코멘트와 집밥 레시피를 함께 보여 주는 React 앱입니다.

## 로컬에서 실행

```bash
cp .env.example .env
# .env 안에 VITE_OPENAI_API_KEY=... 입력
npm install
npm run dev
```

브라우저는 터미널에 표시된 주소(보통 `http://localhost:5173`)로 열면 됩니다. 같은 네트워크의 다른 기기에서는 `http://<이_PC의_LAN_IP>:5173` 으로 접속할 수 있습니다(`vite.config.js`의 `server.host: true`).

### 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_OPENAI_API_KEY` | 예 | OpenAI API 키 |

## 빌드

```bash
npm run build
npm run preview
```

## 스택

React 19, Vite, Tailwind CSS v4, OpenAI JS SDK, canvas-confetti.

프로덕션에서는 API 키를 브라우저에 넣지 말고 백엔드 프록시를 쓰는 것이 안전합니다.

## 배포 (Vercel)

저장소 루트가 곧 앱 폴더입니다. Vercel 프로젝트 설정에서 **Root Directory**를 비우거나 `.` 로 두고, 환경 변수 `VITE_OPENAI_API_KEY`를 넣으면 됩니다. (이전에 `food-app`으로 지정했다면 제거하세요.)
