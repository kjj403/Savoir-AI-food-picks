function clampScore(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 82
  return Math.min(100, Math.max(0, Math.round(x)))
}

export function normalizeNutrition(raw) {
  if (!raw || typeof raw !== 'object') return null
  const calories = Number(raw.calories)
  const carbs = Number(raw.carbs)
  const protein = Number(raw.protein)
  const fat = Number(raw.fat)
  const sodium = Number(raw.sodium)
  const nums = [calories, carbs, protein, fat, sodium]
  if (nums.every((x) => !Number.isFinite(x))) return null
  return {
    calories: Number.isFinite(calories) ? Math.max(0, calories) : 0,
    carbs: Number.isFinite(carbs) ? Math.max(0, carbs) : 0,
    protein: Number.isFinite(protein) ? Math.max(0, protein) : 0,
    fat: Number.isFinite(fat) ? Math.max(0, fat) : 0,
    sodium: Number.isFinite(sodium) ? Math.max(0, sodium) : 0,
  }
}

/**
 * @param {object} parsed - raw GPT JSON
 * @param {{ weather: string, hunger: string, mood: string, budget: string }} labels
 */
export function normalizeRecommendation(parsed, labels) {
  const dish = String(parsed?.food ?? parsed?.dish ?? '').trim() || '오늘의 한 끼'
  const overallMatchScore = clampScore(parsed?.overallMatchScore ?? parsed?.overallScore)

  const reasonSummary =
    String(parsed?.reasonSummary ?? parsed?.reason ?? '').trim() ||
    `${labels.mood} 기분과 ${labels.hunger} 배고픔에 맞춰 골랐어요.`

  const nutrition = normalizeNutrition(parsed?.nutrition)

  const badgesRaw = parsed?.nutritionBadges
  const nutritionBadgesFromModel = Array.isArray(badgesRaw)
    ? badgesRaw.map((b) => String(b).trim()).filter(Boolean)
    : []

  const comp = parsed?.comparison ?? {}
  const comparison = {
    referenceFood: String(comp.referenceFood ?? '일반적인 후라이드 치킨 1인분').trim(),
    calorieRatio: Number(comp.calorieRatio),
    summary: String(comp.summary ?? '').trim(),
  }
  if (!Number.isFinite(comparison.calorieRatio) || comparison.calorieRatio <= 0) {
    comparison.calorieRatio = null
  }

  const hi = parsed?.healthInsight ?? {}
  const sodiumPct = Number(hi.sodiumPercentOfDaily)
  const healthInsight = {
    hook: String(hi.hook ?? '').trim(),
    sodiumPercentOfDaily: Number.isFinite(sodiumPct) ? Math.min(150, Math.max(0, Math.round(sodiumPct))) : null,
    bestTimeToEat: String(hi.bestTimeToEat ?? '').trim(),
    goalConnection: String(hi.goalConnection ?? '').trim(),
  }
  if (!healthInsight.hook) {
    healthInsight.hook = `${labels.mood} 무드 + ${labels.hunger} 배고픔을 고르셨어요. 그에 맞춰 한 끼를 골랐어요.`
  }

  const warning = String(parsed?.warning ?? hi.warning ?? '').trim()

  const alt = Array.isArray(parsed?.mealAlternatives) ? parsed.mealAlternatives : []
  const mealAlternatives = alt
    .slice(0, 4)
    .map((a) => ({
      name: String(a?.name ?? '').trim(),
      oneLiner: String(a?.oneLiner ?? '').trim(),
    }))
    .filter((a) => a.name)

  return {
    dish,
    overallMatchScore,
    reasonSummary,
    nutrition,
    nutritionBadgesFromModel,
    comparison,
    healthInsight,
    warning,
    mealAlternatives,
  }
}

export function normalizeRecipeStep(raw, i) {
  const o = raw && typeof raw === 'object' ? raw : {}
  const prep = Number(o.prepMinutes ?? o.minutes)
  const heat = String(o.heat ?? o.heatLevel ?? 'medium').toLowerCase()
  const heatKo =
    heat === 'low' || heat === '약'
      ? '약불'
      : heat === 'high' || heat === '강'
        ? '강불'
        : '중불'
  return {
    index: i + 1,
    prepMinutes: Number.isFinite(prep) && prep >= 0 ? Math.round(prep) : 5,
    heat: heatKo,
    instruction: String(o.instruction ?? o.text ?? '').trim() || `단계 ${i + 1}`,
    technique: String(o.technique ?? '').trim(),
    proTip: String(o.proTip ?? o.tip ?? '').trim(),
  }
}

export function normalizeRecipe(parsed, fallbackTitle) {
  const title = String(parsed?.title ?? fallbackTitle ?? '').trim() || '집밥 레시피'
  const prepMinutes = Number(parsed?.prepMinutes)
  const cookMinutes = Number(parsed?.cookMinutes)
  const totalMinutes = Number(parsed?.totalMinutes ?? parsed?.minutes)
  let prep = Number.isFinite(prepMinutes) ? prepMinutes : 15
  let cook = Number.isFinite(cookMinutes) ? cookMinutes : 20
  let total = Number.isFinite(totalMinutes) ? totalMinutes : prep + cook
  if (total < prep + cook) total = prep + cook

  const ingredients = Array.isArray(parsed?.ingredients)
    ? parsed.ingredients.map((ing, i) => ({
        item: String(ing?.item ?? ing?.name ?? '').trim() || `재료 ${i + 1}`,
        qty: String(ing?.qty ?? ing?.amount ?? '').trim(),
        note: String(ing?.note ?? '').trim(),
      }))
    : []

  let steps = []
  if (Array.isArray(parsed?.steps)) {
    steps = parsed.steps.map((s, i) => {
      if (typeof s === 'string') {
        return normalizeRecipeStep({ instruction: s, prepMinutes: 5, heat: 'medium' }, i)
      }
      return normalizeRecipeStep(s, i)
    })
  }

  return {
    title,
    prepMinutes: Math.max(0, Math.round(prep)),
    cookMinutes: Math.max(0, Math.round(cook)),
    totalMinutes: Math.max(0, Math.round(total)),
    difficulty: String(parsed?.difficulty ?? '보통'),
    ingredients,
    steps,
    savingTips: String(parsed?.savingTips ?? '').trim(),
    substitutions: String(parsed?.substitutions ?? '').trim(),
  }
}
