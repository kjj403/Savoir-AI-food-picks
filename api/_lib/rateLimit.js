const PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 10)
const PER_DAY = Number(process.env.RATE_LIMIT_PER_DAY ?? 100)

function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  const real = req.headers?.['x-real-ip']
  if (real) return String(real).trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

async function upstash(pathParts) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const res = await fetch(
    `${url.replace(/\/$/, '')}/${pathParts.map(encodeURIComponent).join('/')}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return null
  return res.json()
}

export async function enforceRateLimit(req) {
  const ip = getClientIp(req)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { ok: true, ip, mode: 'disabled' }
  }

  const minuteBucket = Math.floor(Date.now() / 60_000)
  const dayBucket = new Date().toISOString().slice(0, 10)
  const minuteKey = `pml:rl:min:${ip}:${minuteBucket}`
  const dayKey = `pml:rl:day:${ip}:${dayBucket}`

  const [minRes, dayRes] = await Promise.all([
    upstash(['INCR', minuteKey]),
    upstash(['INCR', dayKey]),
  ])
  if (!minRes || !dayRes) return { ok: true, ip, mode: 'degraded' }

  const minCount = Number(minRes.result)
  const dayCount = Number(dayRes.result)
  if (minCount === 1) await upstash(['EXPIRE', minuteKey, '70'])
  if (dayCount === 1) await upstash(['EXPIRE', dayKey, '86400'])

  if (minCount > PER_MINUTE) {
    return { ok: false, ip, reason: 'rate:minute', retryAfter: 60 }
  }
  if (dayCount > PER_DAY) {
    return { ok: false, ip, reason: 'rate:day', retryAfter: 3600 }
  }
  return { ok: true, ip, mode: 'live', minute: minCount, day: dayCount }
}
