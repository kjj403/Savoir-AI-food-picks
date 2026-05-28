import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { InputForm } from './components/InputForm'
import { ResultDisplay } from './components/ResultDisplay'
import {
  WEATHER,
  HUNGER,
  MOOD,
  COMPANY,
  BUDGET,
  CUISINE,
  EXERCISE_LINK,
  NUTRIENT_FOCUS,
  defaultInputValues,
} from './data/foodOptions'
import { requestRecommendation, requestRecipe } from './lib/api'
import { saveToHistory, checkRepeat } from './utils/storage'
import { getCachedRecommendation, setCachedRecommendation } from './utils/recommendationCache'
import { formatRecipeForShare } from './utils/recipeText'
import {
  normalizeRecommendation,
  normalizeRecipe,
} from './utils/recommendationNormalize'
import { playSuccessChime } from './utils/successSound'

const THEME_KEY = 'pick-my-lunch-theme'

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
    async (rawValues, options = {}) => {
      const values = { ...defaultInputValues, ...rawValues }
      const { skipCache = false, excludeDish } = options
      setError('')
      if (!guardAction()) return

      const labels = {
        weather: labelById(WEATHER, values.weather),
        hunger: labelById(HUNGER, values.hunger),
        mood: labelById(MOOD, values.mood),
        company: labelById(COMPANY, values.company),
        budget: labelById(BUDGET, values.budget),
        cuisine: labelById(CUISINE, values.cuisine),
        exerciseTiming: labelById(EXERCISE_LINK, values.exerciseTiming),
        nutrientFocus: labelById(NUTRIENT_FOCUS, values.nutrientFocus),
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
        await delay(1000)
        const response = await requestRecommendation({
          values,
          excludeDish: typeof excludeDish === 'string' ? excludeDish.trim() : '',
        })
        const payload = normalizeRecommendation(response?.data ?? {}, labels)

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
    runRecommendation(input, { skipCache: true, excludeDish: dish })
  }, [input, runRecommendation, dish])

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
      if (!dish.trim()) return
      if (variant) setRecipeVariantLoading(variant)
      else setRecipeLoading(true)
      setRecipeShareFeedback('')
      try {
        const response = await requestRecipe({
          dish,
          reasonSummary,
          values: { ...defaultInputValues, ...input },
          variant,
        })
        setRecipe(normalizeRecipe(response?.data ?? {}, dish))
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : '레시피를 불러오지 못했어요. 다시 시도해 주세요.'
        setRecipeShareFeedback(msg)
      } finally {
        setRecipeLoading(false)
        setRecipeVariantLoading(null)
      }
    },
    [dish, reasonSummary, input],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-200 via-orange-100 to-rose-200 bg-fixed transition-colors duration-300 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.5)_0%,_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(251,146,60,0.08)_0%,_transparent_50%)]" />

      <div className="relative mx-auto w-full max-w-[min(100%,96rem)] px-3 pb-16 pt-8 sm:px-5 lg:px-8 lg:pt-10">
        <header className="mb-8 flex flex-col gap-4 lg:mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 lg:text-left">
              <h1 className="bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-4xl md:text-5xl">
                Pick My Lunch
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
            오늘 점심 메뉴는?
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-10 md:max-w-4xl lg:max-w-[min(100%,88rem)] lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
          <section className="min-w-0 lg:col-span-5" aria-label="오늘의 분위기와 취향">
            <InputForm
              values={input}
              onChange={setInput}
              onSubmit={(v) => runRecommendation(v)}
              disabled={loading}
            />
          </section>

          <section className="min-w-0 lg:col-span-7" aria-label="추천 결과">
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
          </section>
        </div>

        <footer className="mt-14 border-t border-white/40 pt-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Pick My Lunch — AI 점메추 데모
        </footer>
      </div>
    </div>
  )
}
