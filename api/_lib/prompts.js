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
} from '../../src/data/foodOptions.js'

function labelById(list, id) {
  return list.find((x) => x.id === id)?.label ?? id
}

export function resolveValues(input) {
  return { ...defaultInputValues, ...(input ?? {}) }
}

export function buildLabels(values) {
  return {
    weather: labelById(WEATHER, values.weather),
    hunger: labelById(HUNGER, values.hunger),
    mood: labelById(MOOD, values.mood),
    company: labelById(COMPANY, values.company),
    budget: labelById(BUDGET, values.budget),
    cuisine: labelById(CUISINE, values.cuisine),
    exerciseTiming: labelById(EXERCISE_LINK, values.exerciseTiming),
    nutrientFocus: labelById(NUTRIENT_FOCUS, values.nutrientFocus),
  }
}

export function buildRecommendationUserPrompt(values) {
  const labels = buildLabels(values)

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

  const moodSpiceBlock =
    values.mood === 'angry'
      ? 'MOOD: 화남·짜증—prioritize SPICY / high capsaicin / "스트레스 풀" foods that fit the chosen cuisine (한식이면 매운 떡볶이·불닭·마라 등, 분식 프랜차이즈 시그니처 매운맛도 OK). reasonSummary에서 매운맛·자극으로 기분 전환을 짧게 연결. nutritionBadges에 🔥 매운맛 등 가능.'
      : ''

  const companyBlock =
    values.company === 'solo'
      ? 'Dining company: 혼밥—single-portion·한 그릇·도시락·카운터 메뉴 등 1인에게 무리 없는 한 끼. 큰 쟁반만 추천하지 말 것.'
      : values.company === 'pair'
        ? 'Dining company: 둘이서—2인 세트·나눠 먹기 좋은 찌개+밥·덮밥 2개·소형 플래터 등 커플/동료 두 명에 맞는 양·구성.'
        : 'Dining company: 여러 명(3+)—닭갈비·찜닭·치킨·전골·대형 한상 등 나눠 먹기 좋은 메인 위주; reasonSummary에 인원·나눔 언급.'

  return [
    'Recommend ONE specific meal (pick a single winner).',
    cuisineConstraint,
    allergyBlock,
    dislikeBlock,
    exerciseBlock,
    nutrientBlock,
    moodSpiceBlock,
    companyBlock,
    `User labels (use verbatim in analysis): weather="${labels.weather}", hunger="${labels.hunger}", mood="${labels.mood}", company="${labels.company}", budget="${labels.budget}", cuisine="${labels.cuisine}", allergies="${allergies || '없음'}", dislikes="${dislikes || '없음'}", exerciseTiming="${labels.exerciseTiming}", nutrientFocus="${labels.nutrientFocus}".`,
    'reasonSummary must tie the dish to these labels with concrete (non-poetic) reasons.',
    'Health insight must reference these labels and give sodium % of 2300mg day; strongly connect meal timing to exercise when exerciseTiming is not "보통".',
    'Nutrition comparison: referenceFood must be a heavier well-known meal in the SAME cuisine as your pick; calorieRatio = this meal / that reference.',
    'mealAlternatives: exactly 4 items—sides or add-ons that PAIR with the main dish in the SAME cuisine. Not substitute meals or "healthier swaps". oneLiner in Korean. Must also respect allergy/dislike rules.',
  ]
    .filter(Boolean)
    .join('\n')
}

export const RECO_SYSTEM = `You are Pick My Lunch, a premium Korean-market AI food recommender. Reply with JSON only, no markdown.

Schema:
{
  "food": "short name of ONE meal (Korean how people order: generic dish OR chain signature, e.g. 엽기떡볶이, 신전 로제떡볶이, 교촌 허니콤보—still one string)",
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

Naming: real Korean delivery/franchise menu names are encouraged when they match budget+cuisine (분식·치킨·프랜차이즈 등). Keep "food" to one concrete pick.

Estimate nutrition for one typical serving. calorieRatio = this meal calories / reference meal calories.`

export const RECIPE_SYSTEM = `Return JSON only for Korean home cooking.

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

export function buildRecipeUserPrompt({ dish, reasonSummary, values, variant }) {
  const v = resolveValues(values)
  const labels = buildLabels(v)
  const cuisineLine =
    v.cuisine && v.cuisine !== 'any'
      ? `요리 종류(고정): ${labels.cuisine} — 이 풍미·스타일에 맞는 집밥 레시피로.`
      : ''
  const allergyLine = String(v.allergies ?? '').trim()
    ? `알레르기(절대 넣지 말 것): ${v.allergies}`
    : ''
  const dislikeLine = String(v.dislikes ?? '').trim()
    ? `피할 재료·맛: ${v.dislikes}`
    : ''
  const companyLine =
    v.company === 'solo'
      ? '식사: 혼밥—1인분 분량·간단 조리 위주.'
      : v.company === 'pair'
        ? '식사: 둘이서—둘이 나눠 먹기 좋은 양.'
        : '식사: 여러 명—인원 늘리기 쉬운 레시피.'
  const contextLine = [
    companyLine,
    labels.exerciseTiming !== '보통' ? `운동·식사: ${labels.exerciseTiming}` : '',
    labels.nutrientFocus !== '균형' ? `영양: ${labels.nutrientFocus}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const variantNote =
    variant === 'spicier'
      ? 'Rewrite the recipe to be SPICIER for Korean taste (gochugaru, cheongyang, etc.). Keep JSON schema.'
      : variant === 'healthier'
        ? 'Rewrite the recipe HEALTHIER: lower sodium, more vegetables, prefer grill/steam over deep-fry. Keep JSON schema.'
        : ''

  return [
    `메인 요리: ${dish}`,
    reasonSummary ? `한 줄 요약: ${reasonSummary}` : '',
    `예산 느낌: ${labels.budget}`,
    cuisineLine,
    allergyLine,
    dislikeLine,
    contextLine ? `추가 맥락: ${contextLine}` : '',
    variantNote,
  ]
    .filter(Boolean)
    .join('\n')
}
