/**
 * Input bounds for /api/* endpoints.
 *
 * Even after Turnstile + IP rate-limit, a single request with multi-KB
 * `allergies` text would multiply OpenAI token cost. These caps keep the
 * worst-case per-request cost predictable.
 */

const MAX_TEXT = 500
const MAX_DISH = 120
const MAX_REASON = 600
const ALLOWED_VARIANTS = new Set([null, undefined, '', 'spicier', 'healthier'])

function tooLong(value, max) {
  return typeof value === 'string' && value.length > max
}

export function validateRecommendationBody(body) {
  if (!body || typeof body !== 'object') return 'body:invalid'
  const v = body.values
  if (v && typeof v === 'object') {
    if (tooLong(v.allergies, MAX_TEXT)) return 'values.allergies:too-long'
    if (tooLong(v.dislikes, MAX_TEXT)) return 'values.dislikes:too-long'
  }
  if (tooLong(body.excludeDish, MAX_DISH)) return 'excludeDish:too-long'
  return null
}

export function validateRecipeBody(body) {
  if (!body || typeof body !== 'object') return 'body:invalid'
  if (typeof body.dish !== 'string' || !body.dish.trim()) return 'dish:missing'
  if (tooLong(body.dish, MAX_DISH)) return 'dish:too-long'
  if (tooLong(body.reasonSummary, MAX_REASON)) return 'reasonSummary:too-long'
  if (!ALLOWED_VARIANTS.has(body.variant)) return 'variant:invalid'
  const v = body.values
  if (v && typeof v === 'object') {
    if (tooLong(v.allergies, MAX_TEXT)) return 'values.allergies:too-long'
    if (tooLong(v.dislikes, MAX_TEXT)) return 'values.dislikes:too-long'
  }
  return null
}
