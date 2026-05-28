import { getTurnstileToken, hasTurnstile } from './turnstile.js'

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function friendlyMessage(status, code, fallback) {
  if (status === 429) {
    return code === 'rate:day'
      ? '오늘 사용량 한도를 채웠어요. 내일 다시 시도해 주세요.'
      : '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  }
  if (status === 403) {
    if (code?.startsWith('turnstile')) return '봇 차단 검증을 통과하지 못했어요. 새로고침 후 다시 시도해 주세요.'
    if (code?.startsWith('origin')) return '허용되지 않은 출처에서 호출되었어요.'
  }
  if (status === 502 && code === 'openai:parse') {
    return '응답을 해석하지 못했어요. 다시 시도해 주세요.'
  }
  if (status >= 500) return fallback ?? '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
  return fallback ?? '요청에 실패했어요. 잠시 후 다시 시도해 주세요.'
}

async function postJson(path, payload) {
  let turnstileToken = null
  if (hasTurnstile()) {
    turnstileToken = await getTurnstileToken()
    if (!turnstileToken) {
      throw new ApiError('봇 차단 검증을 받지 못했어요. 잠시 후 다시 시도해 주세요.', {
        status: 403,
        code: 'turnstile:no-token',
      })
    }
  }

  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, turnstileToken }),
    })
  } catch {
    throw new ApiError('네트워크 오류가 발생했어요. 연결을 확인해 주세요.', {
      status: 0,
      code: 'network',
    })
  }

  let json = null
  try {
    json = await res.json()
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const code = json?.error
    throw new ApiError(friendlyMessage(res.status, code, json?.message), {
      status: res.status,
      code,
    })
  }

  return json
}

export function requestRecommendation({ values, excludeDish } = {}) {
  return postJson('/api/recommend', { values, excludeDish })
}

export function requestRecipe({ dish, reasonSummary, values, variant } = {}) {
  return postJson('/api/recipe', { dish, reasonSummary, values, variant })
}

export { ApiError }
