import { enforceRateLimit } from './rateLimit.js'
import { verifyTurnstile } from './turnstile.js'

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

function allowedOrigins() {
  const list = new Set()
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    list.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  }
  if (process.env.VERCEL_URL) {
    list.add(`https://${process.env.VERCEL_URL}`)
  }
  for (const o of String(process.env.ALLOWED_ORIGINS ?? '').split(',')) {
    const v = o.trim()
    if (v) list.add(v)
  }
  if (process.env.VERCEL !== '1') {
    for (const o of DEV_ORIGINS) list.add(o)
  }
  return list
}

function checkOrigin(req) {
  const origin = req.headers?.origin
  if (!origin) {
    if (process.env.VERCEL !== '1') return { ok: true, origin: null, mode: 'dev-no-origin' }
    return { ok: false, reason: 'origin:missing' }
  }
  const list = allowedOrigins()
  if (!list.has(origin)) return { ok: false, reason: 'origin:forbidden', origin }
  return { ok: true, origin }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return null
    }
  }
  // Fallback for raw streams (shouldn't normally happen on Vercel Node funcs)
  return null
}

export async function runGuards(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST')
    res.status(204).end()
    return { handled: true }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'method' })
    return { handled: true }
  }

  const origin = checkOrigin(req)
  if (!origin.ok) {
    res.status(403).json({ error: origin.reason })
    return { handled: true }
  }

  const body = await readJsonBody(req)
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'json:invalid' })
    return { handled: true }
  }

  const rate = await enforceRateLimit(req)
  if (!rate.ok) {
    if (rate.retryAfter) res.setHeader('Retry-After', String(rate.retryAfter))
    res.status(429).json({ error: rate.reason })
    return { handled: true }
  }

  const ts = await verifyTurnstile(body.turnstileToken, rate.ip)
  if (!ts.ok) {
    res.status(403).json({ error: ts.reason })
    return { handled: true }
  }

  return { handled: false, body, ip: rate.ip }
}
