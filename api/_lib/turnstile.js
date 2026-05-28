const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.VERCEL !== '1') {
      return { ok: true, mode: 'dev-skip' }
    }
    return { ok: false, reason: 'turnstile:secret-missing' }
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'turnstile:token-missing' }
  }

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  let data
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body })
    data = await res.json()
  } catch {
    return { ok: false, reason: 'turnstile:network' }
  }

  if (!data?.success) {
    const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(',') : 'unknown'
    return { ok: false, reason: `turnstile:${codes}` }
  }
  return { ok: true }
}
