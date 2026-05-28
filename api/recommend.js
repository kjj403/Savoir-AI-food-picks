import { runGuards } from './_lib/guards.js'
import { getServerOpenAI } from './_lib/openaiServer.js'
import {
  RECO_SYSTEM,
  buildLabels,
  buildRecommendationUserPrompt,
  resolveValues,
} from './_lib/prompts.js'
import { validateRecommendationBody } from './_lib/validate.js'

function normDishLabel(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default async function handler(req, res) {
  const guard = await runGuards(req, res)
  if (guard.handled) return

  const validationError = validateRecommendationBody(guard.body)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const values = resolveValues(guard.body.values)
  const excludeDish =
    typeof guard.body.excludeDish === 'string' ? guard.body.excludeDish.trim() : ''

  const labels = buildLabels(values)
  const userPrompt = buildRecommendationUserPrompt(values)
  const labelsLine = `\nLabels for hook line: mood="${labels.mood}", hunger="${labels.hunger}", company="${labels.company}", budget="${labels.budget}", weather="${labels.weather}", cuisine="${labels.cuisine}", exercise="${labels.exerciseTiming}", nutrient="${labels.nutrientFocus}".`
  const excludeBlock = excludeDish
    ? `\n\n[다시 뽑기] 직전 추천 "${excludeDish}"은(는) 다시 내지 마세요. 같은 음식·같은 브랜드 동일 라인·겉만 다른 변형(예: 매운맛만 다른 같은 떡볶이)도 피하고, 사용자가 바로 구분할 만큼 다른 한 끼를 고르세요. food 문자열이 이전과 달라야 합니다.`
    : ''

  let client
  try {
    client = getServerOpenAI()
  } catch (e) {
    res.status(500).json({ error: 'server:openai-config', message: e.message })
    return
  }

  const fetchReco = (extra = '', temperature = excludeDish ? 1.15 : 1) =>
    client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature,
      messages: [
        { role: 'system', content: RECO_SYSTEM },
        {
          role: 'user',
          content: `${userPrompt}${excludeBlock}${extra}${labelsLine}`,
        },
      ],
    })

  const parseRaw = (raw) => {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  try {
    let completion = await fetchReco()
    let raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
    let parsed = parseRaw(raw)
    if (!parsed) {
      res.status(502).json({ error: 'openai:parse' })
      return
    }

    if (
      excludeDish &&
      normDishLabel(parsed?.food ?? parsed?.dish) === normDishLabel(excludeDish)
    ) {
      completion = await fetchReco(
        '\n\n[재시도 필수] 직전과 동일한 food가 나왔습니다. 다른 요리 부류(예: 면↔밥, 튀김↔국물, 치킨↔분식)로 바꿔 food를 다르게 쓰세요.',
        1.35,
      )
      raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
      const retry = parseRaw(raw)
      if (retry) parsed = retry
    }

    res.status(200).json({ data: parsed, labels })
  } catch (e) {
    const status = e?.status ?? e?.response?.status ?? 500
    const message =
      e?.error?.message ?? e?.message ?? 'OpenAI request failed.'
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'openai:request',
      message,
    })
  }
}
