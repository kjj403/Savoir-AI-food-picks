# Savoir

**Savoir**는 분위기(날씨·배고픔·무드·예산)에 맞춰 GPT-4o로 한 끼를 추천하고, 영양·건강 코멘트와 집밥 레시피를 함께 보여 주는 React 앱입니다.

## 라이브 데모

- **프로덕션 (Vercel):** [https://savoir-ai-food-picks.vercel.app](https://savoir-ai-food-picks.vercel.app)

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

저장소 루트가 곧 앱 폴더입니다. **Root Directory**는 `./` (기본값)로 두면 됩니다.

1. **Environment Variables**에서 `VITE_OPENAI_API_KEY`를 추가하고, 값에 OpenAI API 키를 넣습니다. (Production에 체크; Preview도 쓰려면 동일하게 추가.)
2. **Deploy**를 누릅니다. 빌드 로그에 에러가 없으면 성공입니다.
3. 배포 후 상단 **Visit** 또는 **Domains**에서 `https://프로젝트이름.vercel.app` 주소를 확인합니다.
4. 키를 바꾼 뒤에는 **Deployments → 해당 배포 → Redeploy** 하거나, 새 커밋을 푸시하면 자동으로 다시 빌드됩니다.

### 안정적으로 쓰기 위한 팁

- **환경 변수는 Vercel에만** 두고, GitHub에는 `.env`를 올리지 않습니다(이미 `.gitignore`에 포함).
- API 키를 수정했으면 **재배포**해야 새 키가 프론트 빌드에 반영됩니다(`VITE_*`는 빌드 시 주입).
- Vercel **Hobby** 플랜은 트래픽·빌드 제한이 있으니, 공개 전에 한 번 브라우저에서 추천 요청이 되는지 확인합니다.

### README에 배포 링크 넣는 방법

1. Vercel 프로젝트 → **Settings → Domains** 또는 배포 완료 화면에서 **프로덕션 URL**을 복사합니다.
2. 이 파일 상단 **「라이브 데모」** 섹션에서 괄호 안 주소를 붙여 넣습니다.
3. 마크다운 형식은 `[보이는 텍스트](https://실제주소)` 입니다.  
   예: `[Savoir 열기](https://savoir-ai-food-picks.vercel.app)`
4. 저장 후 `git add README.md` → `git commit` → `git push` 하면 GitHub 저장소 메인에도 반영됩니다.
