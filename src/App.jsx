import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { InputForm } from './components/InputForm'
import { ResultDisplay } from './components/ResultDisplay'
import {
  WEATHER,
  HUNGER,
  MOOD,
  BUDGET,
  CUISINE,
  EXERCISE_LINK,
  NUTRIENT_FOCUS,
  defaultInputValues,
} from './data/foodOptions'
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
  const c = labelById(CUISINE, values.cuisine)

  const cuisineConstraint =
    values.cuisine === 'any'
      ? 'Cuisine: 아무거나—한식·중식·일식·양식 중 사용자 분위기에 가장 맞는 한 끼 하나를 고른다.'
      : values.cuisine === 'korean'
        ? 'STRICT: 한식만. 메인 "food"는 한국 음식(밥·국·찌개·분식·한정식·한국식 면 등)이어야 한다. 중식·일식·양식 요리명을 메인으로 쓰지 마라. mealAlternatives도 한식 곁들임만.'
        : values.cuisine === 'chinese'
          ? 'STRICT: 중식만. 메인은 중국 요리(짜장·짬뽕·마라·딤섬 등). mealAlternatives는 중식과 어울리는 반찬·꼬치·국물 등.'
          : values.cuisine === 'japanese'
            ? 'STRICT: 일식만. 메인은 일본식(초밥·돈카츠·라멘·덮밥·우동 등). mealAlternatives는 일식 세트에 어울리는 곁들임만.'
            : values.cuisine === 'western'
              ? 'STRICT: 양식만. 메인은 서양식(파스타·스테이크·샐러드·버거·리조또 등). mealAlternatives는 같은 양식 흐름의 수프·브레드·사이드.'
              : ''

  const allergies = String(values.allergies ?? '').trim()
  const dislikes = String(values.dislikes ?? '').trim()
  const exLabel = labelById(EXERCISE_LINK, values.exerciseTiming)
  const nfLabel = labelById(NUTRIENT_FOCUS, values.nutrientFocus)

  const allergyBlock = allergies
    ? `CRITICAL safety: user is allergic or must avoid: "${allergies}". Never recommend dishes containing these (including sauces, broths, hidden ingredients). mealAlternatives must also be safe. If ambiguous, choose safer options.`
    : 'No allergies listed.'

  const dislikeBlock = dislikes
    ? `User strongly dislikes (avoid as dominant flavor/ingredient): "${dislikes}".`
    : 'No dislikes listed.'

  const exerciseBlock =
    values.exerciseTiming === 'none'
      ? 'Exercise link: not specified—healthInsight may still mention meal timing generally.'
      : values.exerciseTiming === 'before'
        ? 'Exercise: user eats BEFORE workout—prefer digestible carbs, moderate fat, not overly heavy; healthInsight.hook and bestTimeToEat MUST connect to pre-workout fueling (운동 전 에너지).'
        : values.exerciseTiming === 'after'
          ? 'Exercise: user eats AFTER workout—prioritize protein + carbs for recovery; hook and bestTimeToEat MUST mention post-workout refueling (운동 후 회복).'
          : values.exerciseTiming === 'rest'
            ? 'Exercise: rest/light day—lighter or comfort meals OK; mention in hook when relevant.'
            : ''

  const nutrientBlock = (() => {
    switch (values.nutrientFocus) {
      case 'high_protein':
        return 'Nutrient priority: HIGH PROTEIN—main dish must be protein-rich (meat, fish, eggs, tofu, legumes as fits cuisine). Cite protein in reasonSummary; goalConnection ties to 단백질·근육·회복.'
      case 'more_veggies':
        return 'Nutrient priority: vegetables & fiber—favor vegetable-heavy, salad, or stir-fry with lots of greens within cuisine.'
      case 'low_sodium':
        return 'Nutrient priority: lower sodium—prefer steamed/boiled/less salty dishes; expand warning about sodium.'
      case 'lighter':
        return 'Nutrient priority: lighter meal—favor grilled, clear soups, smaller fried portions within cuisine.'
      default:
        return 'Nutrient priority: balanced plate.'
    }
  })()

  return [
    'Recommend ONE specific meal (pick a single winner).',
    cuisineConstraint,
    allergyBlock,
    dislikeBlock,
    exerciseBlock,
    nutrientBlock,
    `User labels (use verbatim in analysis): weather="${w}", hunger="${h}", mood="${m}", budget="${b}", cuisine="${c}", allergies="${allergies || '없음'}", dislikes="${dislikes || '없음'}", exerciseTiming="${exLabel}", nutrientFocus="${nfLabel}".`,
    'reasonSummary must tie the dish to these labels with concrete (non-poetic) reasons.',
    'Health insight must reference these labels and give sodium % of 2300mg day; strongly connect meal timing to exercise when exerciseTiming is not "보통".',
    'Nutrition comparison: referenceFood must be a heavier well-known meal in the SAME cuisine as your pick; calorieRatio = this meal / that reference.',
    'mealAlternatives: exactly 4 items—sides or add-ons that PAIR with the main dish in the SAME cuisine. Not substitute meals or "healthier swaps". oneLiner in Korean. Must also respect allergy/dislike rules.',
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
    "referenceFood": "well-known heavier meal in the SAME cuisine as food",
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

mealAlternatives: always 4 entries. Each must complement "food" in the same cuisine (e.g. 한식 분식 세트, 중식 반찬, 일식 곁들임). Never frame as lower-calorie or "instead of" the main pick.

If the user specified a cuisine (한/중/일/양), "food" and every mealAlternative MUST stay in that cuisine. If 아무거나, any cuisine is allowed.

If the user listed allergies, never output dish names or sides that contain those allergens.

Estimate nutrition for one typical serving. calorieRatio = this meal calories / reference meal calories.`

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
    async (rawValues, options = {}) => {
      const values = { ...defaultInputValues, ...rawValues }
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
        const client = getOpenAIClient()
        const userPrompt = buildUserPrompt(values)

        const apiPromise = client.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: RECO_SYSTEM },
            {
              role: 'user',
              content: `${userPrompt}\nLabels for hook line: mood="${labels.mood}", hunger="${labels.hunger}", budget="${labels.budget}", weather="${labels.weather}", cuisine="${labels.cuisine}", exercise="${labels.exerciseTiming}", nutrient="${labels.nutrientFocus}".`,
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
        const i = { ...defaultInputValues, ...input }
        const budgetLabel = labelById(BUDGET, i.budget)
        const cuisineLabel = labelById(CUISINE, i.cuisine)
        const cuisineLine =
          i.cuisine && i.cuisine !== 'any'
            ? `요리 종류(고정): ${cuisineLabel} — 이 풍미·스타일에 맞는 집밥 레시피로.`
            : ''
        const allergyLine = String(i.allergies ?? '').trim()
          ? `알레르기(절대 넣지 말 것): ${i.allergies}`
          : ''
        const dislikeLine = String(i.dislikes ?? '').trim()
          ? `피할 재료·맛: ${i.dislikes}`
          : ''
        const exLab = labelById(EXERCISE_LINK, i.exerciseTiming)
        const nfLab = labelById(NUTRIENT_FOCUS, i.nutrientFocus)
        const contextLine = [exLab !== '보통' ? `운동·식사: ${exLab}` : '', nfLab !== '균형' ? `영양: ${nfLab}` : '']
          .filter(Boolean)
          .join(' · ')
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
                cuisineLine,
                allergyLine,
                dislikeLine,
                contextLine ? `추가 맥락: ${contextLine}` : '',
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

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 md:max-w-4xl lg:gap-12">
          <section className="min-w-0 w-full" aria-label="오늘의 분위기와 취향">
            <InputForm
              values={input}
              onChange={setInput}
              onSubmit={(v) => runRecommendation(v)}
              disabled={loading}
            />
          </section>

          <section className="min-w-0 w-full" aria-label="추천 결과">
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
          Savoir — AI 점메추 데모
        </footer>
      </div>
    </div>
  )
}
