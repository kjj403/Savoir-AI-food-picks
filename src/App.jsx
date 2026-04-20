import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { InputForm } from './components/InputForm'
import { ResultDisplay } from './components/ResultDisplay'
import { WEATHER, HUNGER, MOOD, BUDGET, defaultInputValues } from './data/foodOptions'
import { getOpenAIClient } from './lib/openai'
import { saveToHistory, checkRepeat } from './utils/storage'
import { hasApiKey } from './utils/env'
import { getCachedRecommendation, setCachedRecommendation } from './utils/recommendationCache'
import { formatRecipeForShare } from './utils/recipeText'
import {
  normalizeRecommendation,
  normalizeRecipe,
} from './utils/recommendationNormalize'
import { playSuccessChime } from './utils/successSound'

const THEME_KEY = 'savoir-theme'

function getInitialDark() {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const GUARD_MS = 750

function labelById(list, id) {
  return list.find((x) => x.id === id)?.label ?? id
}

function buildUserPrompt(values) {
  const w = labelById(WEATHER, values.weather)
  const h = labelById(HUNGER, values.hunger)
  const m = labelById(MOOD, values.mood)
  const b = labelById(BUDGET, values.budget)
  return [
    'Recommend ONE specific meal (pick a single winner).',
    `User labels (use verbatim in analysis): weather="${w}", hunger="${h}", mood="${m}", budget="${b}".`,
    'reasonSummary must tie the dish to these labels with concrete (non-poetic) reasons.',
    'Health insight must reference these labels and give sodium % of 2300mg day, meal timing vs workout if relevant.',
    'Nutrition comparison: pick a well-known heavier Korean meal as reference for calorie ratio.',
    'mealAlternatives: output exactly 4 items—Korean sides or add-ons that PAIR with the main dish (e.g. 떡볶이 → 튀김, 순대, 김밥, 어묵). Not substitute meals or "healthier swaps"; classic flavor/texture combos. Korean oneLiners explain the pairing.',
  ].join('\n')
}

const RECO_SYSTEM = `You are Savoir, a premium Korean-market AI food recommender. Reply with JSON only, no markdown.

Schema:
{
  "food": "short name of ONE meal",
  "overallMatchScore": 0-100,
  "reasonSummary": "2-3 sentences Korean: data-backed why this dish fits the user (not poetry)",
  "nutrition": {
    "calories": number,
    "carbs": number,
    "protein": number,
    "fat": number,
    "sodium": number
  },
  "nutritionBadges": ["2-4 short Korean badges like 🔥 고탄수", "💪 단백질 양호"],
  "comparison": {
    "referenceFood": "well-known Korean reference meal",
    "calorieRatio": 0.0-2.0,
    "summary": "Korean: compare this dish calories vs reference (e.g. 약 0.35배 칼로리)"
  },
  "healthInsight": {
    "hook": "Korean: start with You chose [mood]+[hunger] ... so ...",
    "sodiumPercentOfDaily": 0-150,
    "bestTimeToEat": "Korean, specific timing vs exercise/sleep",
    "goalConnection": "Korean: tie to user budget/mood goals with numbers where possible"
  },
  "warning": "2-4 sentences Korean: who should limit / sodium note",
  "mealAlternatives": [
    { "name": "Korean side or add-on (short)", "oneLiner": "Korean: why it goes with the main dish above (pairing, not a substitute meal)" }
  ]
}

mealAlternatives: always 4 entries. Each must complement "food" (street-food sets, 반찬, 튀김·순대·김밥 같은 조합). Never frame as lower-calorie or "instead of" the main pick.

Estimate nutrition for one typical Korean serving. calorieRatio = this meal calories / reference meal calories.`

const RECIPE_SYSTEM = `Return JSON only for Korean home cooking.

{
  "title": "string",
  "prepMinutes": number,
  "cookMinutes": number,
  "totalMinutes": number,
  "difficulty": "쉬움|보통|어려움",
  "ingredients": [{"item":"Korean","qty":"amount","note":"optional"}],
  "steps": [
    {
      "prepMinutes": number,
      "heat": "low|medium|high",
      "instruction": "Korean: clear step",
      "technique": "Korean/numbers: dice size, time, pan motion",
      "proTip": "Korean tip for this step"
    }
  ],
  "savingTips": "Korean money tips",
  "substitutions": "Korean swaps"
}

Rules: Each step prepMinutes is only that step. Sum of step prepMinutes is a guide; totalMinutes should be realistic (prep+cook). heat must be English low|medium|high.`

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function useActionGuard() {
  const last = useRef(0)
  return useCallback(() => {
    const n = Date.now()
    if (n - last.current < GUARD_MS) return false
    last.current = n
    return true
  }, [])
}

function applyRecoPayload(setters, payload) {
  setters.setDish(payload.dish)
  setters.setOverallMatchScore(payload.overallMatchScore)
  setters.setReasonSummary(payload.reasonSummary)
  setters.setNutrition(payload.nutrition)
  setters.setNutritionBadgesFromModel(payload.nutritionBadgesFromModel ?? [])
  setters.setComparison(payload.comparison)
  setters.setHealthInsight(payload.healthInsight)
  setters.setWarning(payload.warning)
  setters.setMealAlternatives(payload.mealAlternatives ?? [])
}

export default function App() {
  const [input, setInput] = useState(defaultInputValues)
  const [dish, setDish] = useState('')
  const [overallMatchScore, setOverallMatchScore] = useState(0)
  const [reasonSummary, setReasonSummary] = useState('')
  const [nutrition, setNutrition] = useState(null)
  const [nutritionBadgesFromModel, setNutritionBadgesFromModel] = useState([])
  const [comparison, setComparison] = useState(null)
  const [healthInsight, setHealthInsight] = useState(null)
  const [warning, setWarning] = useState('')
  const [mealAlternatives, setMealAlternatives] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liked, setLiked] = useState(false)
  const [dark, setDark] = useState(getInitialDark)

  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipe, setRecipe] = useState(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeVariantLoading, setRecipeVariantLoading] = useState(null)
  const [recipeShareFeedback, setRecipeShareFeedback] = useState('')

  const guardAction = useActionGuard()

  const repeatWarning = Boolean(dish && checkRepeat(dish))

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })
  }, [])

  const resetRecoExtras = useCallback(() => {
    setNutrition(null)
    setOverallMatchScore(0)
    setReasonSummary('')
    setNutritionBadgesFromModel([])
    setComparison(null)
    setHealthInsight(null)
    setWarning('')
    setMealAlternatives([])
    setRecipe(null)
    setRecipeOpen(false)
    setRecipeShareFeedback('')
    setRecipeVariantLoading(null)
  }, [])

  const runRecommendation = useCallback(
    async (values, options = {}) => {
      const { skipCache = false } = options
      setError('')
      if (!hasApiKey()) {
        setError(
          import.meta.env.PROD
            ? 'API 키가 없어요. Vercel 환경 변수에 VITE_OPENAI_API_KEY를 추가한 뒤 Redeploy 하세요.'
            : 'API 키가 없어요. 프로젝트 루트의 .env에 VITE_OPENAI_API_KEY를 추가한 뒤 개발 서버를 다시 실행해 주세요.',
        )
        return
      }
      if (!guardAction()) return

      const labels = {
        weather: labelById(WEATHER, values.weather),
        hunger: labelById(HUNGER, values.hunger),
        mood: labelById(MOOD, values.mood),
        budget: labelById(BUDGET, values.budget),
      }

      if (!skipCache) {
        const cached = getCachedRecommendation(values)
        if (cached) {
          applyRecoPayload(
            {
              setDish,
              setOverallMatchScore,
              setReasonSummary,
              setNutrition,
              setNutritionBadgesFromModel,
              setComparison,
              setHealthInsight,
              setWarning,
              setMealAlternatives,
            },
            cached,
          )
          setLiked(false)
          setRecipe(null)
          setRecipeOpen(false)
          setRecipeShareFeedback('')
          return
        }
      }

      setDish('')
      resetRecoExtras()
      setLiked(false)
      setLoading(true)
      try {
        const client = getOpenAIClient()
        const userPrompt = buildUserPrompt(values)

        const apiPromise = client.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: RECO_SYSTEM },
            {
              role: 'user',
              content: `${userPrompt}\nLabels for hook line: mood="${labels.mood}", hunger="${labels.hunger}", budget="${labels.budget}", weather="${labels.weather}".`,
            },
          ],
        })

        await delay(1000)
        const completion = await apiPromise

        const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
        let parsed
        try {
          parsed = JSON.parse(raw)
        } catch {
          throw new Error('응답을 해석하지 못했어요. 다시 시도해 주세요.')
        }
        const payload = normalizeRecommendation(parsed, labels)

        applyRecoPayload(
          {
            setDish,
            setOverallMatchScore,
            setReasonSummary,
            setNutrition,
            setNutritionBadgesFromModel,
            setComparison,
            setHealthInsight,
            setWarning,
            setMealAlternatives,
          },
          payload,
        )
        setCachedRecommendation(values, payload)
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : '요청에 실패했어요. 잠시 후 다시 시도해 주세요.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [guardAction, resetRecoExtras],
  )

  const handleReshuffle = useCallback(() => {
    runRecommendation(input, { skipCache: true })
  }, [input, runRecommendation])

  const handleLike = useCallback(() => {
    if (!guardAction() || !dish.trim()) return
    saveToHistory(dish, new Date(), {
      calories: nutrition?.calories,
      sodium: nutrition?.sodium,
    })
    playSuccessChime()
    setLiked(true)
  }, [dish, nutrition, guardAction])

  const handleRetry = useCallback(() => {
    setError('')
    runRecommendation(input, { skipCache: true })
  }, [input, runRecommendation])

  const fetchRecipe = useCallback(
    async (variant = null) => {
      if (!hasApiKey() || !dish.trim()) return
      if (variant) setRecipeVariantLoading(variant)
      else setRecipeLoading(true)
      setRecipeShareFeedback('')
      try {
        const client = getOpenAIClient()
        const budgetLabel = labelById(BUDGET, input.budget)
        const variantNote =
          variant === 'spicier'
            ? 'Rewrite the recipe to be SPICIER for Korean taste (gochugaru, cheongyang, etc.). Keep JSON schema.'
            : variant === 'healthier'
              ? 'Rewrite the recipe HEALTHIER: lower sodium, more vegetables, prefer grill/steam over deep-fry. Keep JSON schema.'
              : ''

        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: RECIPE_SYSTEM },
            {
              role: 'user',
              content: [
                `메인 요리: ${dish}`,
                `한 줄 요약: ${reasonSummary}`,
                `예산 느낌: ${budgetLabel}`,
                variantNote,
              ]
                .filter(Boolean)
                .join('\n'),
            },
          ],
        })
        const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
        const parsed = JSON.parse(raw)
        setRecipe(normalizeRecipe(parsed, dish))
      } catch {
        setRecipeShareFeedback('레시피를 불러오지 못했어요. 다시 시도해 주세요.')
      } finally {
        setRecipeLoading(false)
        setRecipeVariantLoading(null)
      }
    },
    [dish, reasonSummary, input.budget],
  )

  const handleRecipeLoad = useCallback(() => fetchRecipe(null), [fetchRecipe])

  const handleRecipeVariant = useCallback(
    (v) => {
      if (recipeLoading || recipeVariantLoading) return
      fetchRecipe(v)
    },
    [fetchRecipe, recipeLoading, recipeVariantLoading],
  )

  const handleRecipeShareCopy = useCallback(async () => {
    if (!recipe) return
    const text = formatRecipeForShare(dish, recipe)
    try {
      await navigator.clipboard.writeText(text)
      setRecipeShareFeedback('레시피를 복사했어요.')
      window.setTimeout(() => setRecipeShareFeedback(''), 2800)
    } catch {
      setRecipeShareFeedback('복사에 실패했어요.')
      window.setTimeout(() => setRecipeShareFeedback(''), 2800)
    }
  }, [dish, recipe])

  const apiMissing = !hasApiKey()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 via-orange-100 to-rose-200 bg-fixed transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.5)_0%,_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.08)_0%,_transparent_50%)]" />

      {apiMissing && (
        <div
          className="relative z-20 border-b border-amber-300/80 bg-amber-100/95 px-4 py-3 text-center text-sm font-medium text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/90 dark:text-amber-100"
          role="alert"
        >
          {import.meta.env.PROD ? (
            <>
              <strong className="font-semibold">API 키가 빌드에 없어요.</strong> Vercel 프로젝트 →{' '}
              <strong>Settings → Environment Variables</strong>에{' '}
              <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                VITE_OPENAI_API_KEY
              </code>
              를 넣고 <strong>Production</strong>에 체크한 뒤,{' '}
              <strong>Deployments → Redeploy</strong>로 다시 배포해 주세요.
            </>
          ) : (
            <>
              <strong className="font-semibold">API 키가 보이지 않아요.</strong> 루트의 .env에{' '}
              <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                VITE_OPENAI_API_KEY
              </code>{' '}
              를 넣고 <code className="font-mono text-xs">npm run dev</code>를 다시 실행해 주세요.
            </>
          )}
        </div>
      )}

      <div className="relative mx-auto w-full max-w-[min(100%,96rem)] px-3 pb-16 pt-8 sm:px-5 lg:px-8 lg:pt-10">
        <header className="mb-8 flex flex-col gap-4 lg:mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-800/90 dark:text-amber-400/90">
                AI tasting companion
              </p>
              <h1 className="mt-1 bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                Savoir
              </h1>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-lg shadow-sm backdrop-blur-md transition hover:bg-white dark:border-slate-600 dark:bg-slate-800/90 dark:hover:bg-slate-700"
              aria-label={dark ? '라이트 모드' : '다크 모드'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-800 dark:text-slate-300 lg:text-base">
            오늘 점메추 고민은 여기서 끝. 분위기만 골라 보세요—Savoir가 한 끼를 뽑아 줄게요.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
          <div className="min-w-0 lg:col-span-5">
            <InputForm
              values={input}
              onChange={setInput}
              onSubmit={(v) => runRecommendation(v)}
              disabled={loading}
            />
          </div>

          <div className="min-w-0 lg:col-span-7">
            <ResultDisplay
              loading={loading}
              dish={dish}
              overallMatchScore={overallMatchScore}
              reasonSummary={reasonSummary}
              error={error}
              nutrition={nutrition}
              nutritionBadgesFromModel={nutritionBadgesFromModel}
              comparison={comparison}
              healthInsight={healthInsight}
              warning={warning}
              mealAlternatives={mealAlternatives}
              onLike={handleLike}
              onReshuffle={handleReshuffle}
              onRetry={handleRetry}
              recipeOpen={recipeOpen}
              onRecipeToggle={setRecipeOpen}
              recipe={recipe}
              recipeLoading={recipeLoading}
              recipeVariantLoading={recipeVariantLoading}
              onRecipeLoad={handleRecipeLoad}
              onRecipeVariant={handleRecipeVariant}
              onRecipeShareCopy={handleRecipeShareCopy}
              recipeShareFeedback={recipeShareFeedback}
              repeatWarning={repeatWarning}
              liked={liked}
              actionsDisabled={loading}
            />
          </div>
        </div>

        <footer className="mt-14 border-t border-white/40 pt-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Savoir — AI 점메추 데모
        </footer>
      </div>
    </div>
  )
}
