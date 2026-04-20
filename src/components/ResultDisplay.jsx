import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { NutritionAndHealth } from './NutritionAndHealth'
import { HomeRecipePanel } from './HomeRecipePanel'
import { ActionLinks } from './ActionLinks'
import { AlternativeMeals } from './AlternativeMeals'

const SLOT_EMOJIS = ['🍕', '🍜', '🍔', '🍗', '🍱']

const THOUGHTS = [
  '취향 신호를 읽는 중…',
  '47가지 요소에 가중치를 넣는 중…',
  '무드·배고픔·예산을 동시에 맞추는 중…',
  '영양 추정과 나트륨 비율을 계산하는 중…',
  '오늘의 한 접시를 확정하는 중…',
]

function fireConfetti() {
  const count = 140
  const defaults = { origin: { y: 0.72 }, zIndex: 9999 }
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.35),
    spread: 100,
    startVelocity: 38,
    ticks: 220,
    scalar: 1.05,
  })
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.25),
    angle: 60,
    spread: 65,
    startVelocity: 48,
  })
  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.25),
    angle: 120,
    spread: 65,
    startVelocity: 48,
  })
}

function fireConfettiReveal() {
  confetti({
    particleCount: 55,
    spread: 70,
    origin: { y: 0.55 },
    startVelocity: 32,
    ticks: 200,
    zIndex: 9999,
    scalar: 0.95,
  })
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 px-1 py-2" aria-hidden>
      <div className="skeleton-bar h-4 w-2/5 max-w-[180px]" />
      <div className="skeleton-bar h-9 w-4/5 max-w-md" />
      <div className="space-y-2">
        <div className="skeleton-bar h-3 w-full" />
        <div className="skeleton-bar h-3 w-11/12" />
        <div className="skeleton-bar h-3 w-3/5" />
      </div>
    </div>
  )
}

function SlotMachineLoader() {
  const strip = [...SLOT_EMOJIS, ...SLOT_EMOJIS]

  return (
    <div
      className="flex justify-center gap-4 py-6 sm:gap-6"
      role="status"
      aria-live="polite"
      aria-label="슬롯 돌아가는 중"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="slot-reel relative h-[4.5rem] w-[4rem] overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-b from-white to-orange-50 shadow-inner dark:border-orange-500/50 dark:from-slate-800 dark:to-slate-900 sm:h-24 sm:w-[4.5rem]"
        >
          <div
            className="slot-reel-inner flex flex-col items-center"
            style={{
              animationDuration: `${0.65 + i * 0.12}s`,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            {strip.map((emoji, j) => (
              <span
                key={j}
                className="flex h-[4.5rem] shrink-0 items-center justify-center text-4xl sm:h-24 sm:text-5xl"
                aria-hidden
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">추천 불러오는 중</span>
    </div>
  )
}

function ThinkingTicker() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % THOUGHTS.length)
    }, 900)
    return () => window.clearInterval(id)
  }, [])
  return (
    <p className="mt-4 text-center text-sm font-medium text-violet-800 dark:text-violet-200">
      <span className="mr-1.5 inline-flex h-2 w-2 animate-pulse rounded-full bg-violet-500 align-middle" />
      {THOUGHTS[i]}
    </p>
  )
}

function friendlyApiMessage(message) {
  const m = String(message)
  if (/API 키|VITE_OPENAI|api key/i.test(m)) {
    return import.meta.env.PROD
      ? 'API 키가 필요해요. Vercel → Settings → Environment Variables에 VITE_OPENAI_API_KEY를 넣고 Redeploy 해 주세요.'
      : 'API 키가 필요해요. 프로젝트 루트의 .env에 VITE_OPENAI_API_KEY를 넣고 서버를 다시 켜 주세요.'
  }
  if (/429|rate|too many/i.test(m)) {
    return '요청이 많아 잠시 쉬었다가 다시 시도해 주세요.'
  }
  if (/network|fetch|Failed to fetch/i.test(m)) {
    return '네트워크를 확인한 뒤 다시 시도해 주세요.'
  }
  return m || '알 수 없는 오류가 났어요. 잠시 후 다시 시도해 주세요.'
}

export function ResultDisplay({
  loading = false,
  dish = '',
  overallMatchScore = 0,
  reasonSummary = '',
  error = '',
  nutrition = null,
  nutritionBadgesFromModel = [],
  comparison = null,
  healthInsight = null,
  warning = '',
  mealAlternatives = [],
  onLike,
  onReshuffle,
  onRetry,
  recipeOpen = false,
  onRecipeToggle,
  recipe = null,
  recipeLoading = false,
  recipeVariantLoading = null,
  onRecipeLoad,
  onRecipeVariant,
  onRecipeShareCopy,
  recipeShareFeedback = '',
  repeatWarning = false,
  liked = false,
  actionsDisabled = false,
}) {
  const confettiFired = useRef(false)
  const revealConfetti = useRef('')

  useEffect(() => {
    if (liked && !confettiFired.current) {
      confettiFired.current = true
      fireConfetti()
    }
    if (!liked) confettiFired.current = false
  }, [liked])

  useEffect(() => {
    if (!loading && dish && revealConfetti.current !== dish) {
      revealConfetti.current = dish
      fireConfettiReveal()
    }
    if (!dish) revealConfetti.current = ''
  }, [loading, dish])

  const fatalError = Boolean(error && !dish && !loading)

  if (fatalError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50/95 p-6 text-center shadow-lg backdrop-blur-sm dark:border-red-900/60 dark:bg-red-950/50">
        <p className="text-base font-medium leading-relaxed text-red-900 dark:text-red-100">
          {friendlyApiMessage(error)}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-bounce-hover mt-6 inline-flex min-h-12 min-w-[160px] items-center justify-center rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-8 py-3 text-base font-bold text-white shadow-lg"
          >
            다시 시도
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl shadow-orange-200/30 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/80 dark:shadow-none">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-900 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100">
            AI
          </span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            맞춤 추론 중
          </span>
        </div>
        <p className="text-center text-base font-bold text-slate-700 dark:text-slate-200">
          🎰 맛 슬롯 돌리는 중…
        </p>
        <LoadingSkeleton />
        <SlotMachineLoader />
        <ThinkingTicker />
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          최소 1초 후 결과가 나와요
        </p>
      </div>
    )
  }

  if (!dish && !reasonSummary) {
    return (
      <div className="rounded-3xl border border-dashed border-orange-200/80 bg-white/50 p-8 text-center text-slate-500 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
        <p className="text-lg font-medium text-slate-600 dark:text-slate-300">
          여기에 추천이 떨어져요
        </p>
        <p className="mt-3 text-base leading-relaxed">
          왼쪽에서 분위기를 고르고{' '}
          <span className="font-semibold text-orange-600 dark:text-amber-400">Surprise me</span>를
          눌러보세요
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up w-full max-w-none rounded-3xl border border-white/60 bg-gradient-to-br from-white/95 to-amber-50/90 p-5 shadow-xl shadow-orange-200/40 backdrop-blur-md dark:border-slate-700/80 dark:from-slate-900/95 dark:to-slate-900/80 dark:shadow-slate-950/40 sm:p-6">
      {error && dish && (
        <div
          className="mb-4 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-left text-sm font-medium text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100"
          role="alert"
        >
          {friendlyApiMessage(error)}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-amber-400">
            오늘의 추천
          </p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <span className="mr-2 text-4xl sm:text-5xl" aria-hidden>
              🍽️
            </span>
            {dish}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          {repeatWarning && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/80 dark:text-red-200">
              ⚠️ 최근 7일간 3번 이상!
            </span>
          )}
          <span className="rounded-full border border-indigo-200 bg-white/90 px-3 py-1.5 text-sm font-bold text-indigo-800 shadow-sm dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-200">
            종합 {overallMatchScore}/100
          </span>
        </div>
      </div>

      {reasonSummary && (
        <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100 sm:text-base">
          {reasonSummary}
        </p>
      )}

      <NutritionAndHealth
        nutrition={nutrition}
        healthInsight={healthInsight}
        warning={warning}
        comparison={comparison}
        modelBadges={nutritionBadgesFromModel}
      />

      <ActionLinks dish={dish} />

      <AlternativeMeals alternatives={mealAlternatives} />

      <HomeRecipePanel
        open={recipeOpen}
        onToggle={onRecipeToggle}
        loading={recipeLoading}
        recipe={recipe}
        onLoad={onRecipeLoad}
        onShareCopy={onRecipeShareCopy}
        shareFeedback={recipeShareFeedback}
        onVariant={onRecipeVariant}
        variantLoading={recipeVariantLoading}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() => onReshuffle?.()}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 bg-white/90 px-4 py-3 text-sm font-bold text-orange-800 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-100 dark:hover:bg-slate-700 sm:text-base"
        >
          <span aria-hidden>🎲</span>
          다시 뽑기
        </button>
        <button
          type="button"
          disabled={liked || !dish || actionsDisabled}
          onClick={() => onLike?.()}
          className="btn-bounce-hover inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-orange-500/35 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
        >
          <span aria-hidden>💖</span>
          {liked ? '저장했어요!' : '마음에 들어요'}
        </button>
      </div>
    </div>
  )
}
