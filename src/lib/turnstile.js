/**
 * Lightweight wrapper around the Cloudflare Turnstile JS API.
 *
 * The script tag itself lives in index.html. We render a single invisible
 * widget on demand and re-use it for every protected request. `getToken()`
 * resolves with a one-shot token (consume server-side; never replay).
 *
 * If VITE_TURNSTILE_SITE_KEY is unset (e.g. local dev without Cloudflare),
 * `getToken()` resolves to null and the server-side guard falls back to its
 * dev-skip mode.
 */

let scriptPromise = null
let widgetId = null
let containerEl = null
let pendingResolve = null

function siteKey() {
  return String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()
}

export function hasTurnstile() {
  return Boolean(siteKey())
}

function loadScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (scriptPromise) return scriptPromise
  if (window.turnstile) {
    scriptPromise = Promise.resolve(true)
    return scriptPromise
  }
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-turnstile]')
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => reject(new Error('turnstile-load')), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.turnstile = '1'
    s.onload = () => resolve(true)
    s.onerror = () => reject(new Error('turnstile-load'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

function ensureWidget() {
  if (widgetId !== null) return
  const key = siteKey()
  if (!key || !window.turnstile) return
  containerEl = document.createElement('div')
  containerEl.setAttribute('aria-hidden', 'true')
  containerEl.style.position = 'fixed'
  containerEl.style.bottom = '0'
  containerEl.style.right = '0'
  containerEl.style.zIndex = '0'
  containerEl.style.opacity = '0'
  containerEl.style.pointerEvents = 'none'
  document.body.appendChild(containerEl)
  widgetId = window.turnstile.render(containerEl, {
    sitekey: key,
    size: 'invisible',
    callback: (token) => {
      const r = pendingResolve
      pendingResolve = null
      r?.(token ?? null)
    },
    'error-callback': () => {
      const r = pendingResolve
      pendingResolve = null
      r?.(null)
    },
    'timeout-callback': () => {
      const r = pendingResolve
      pendingResolve = null
      r?.(null)
    },
  })
}

export async function getTurnstileToken({ timeoutMs = 12_000 } = {}) {
  if (!hasTurnstile()) return null
  try {
    await loadScript()
  } catch {
    return null
  }
  ensureWidget()
  if (widgetId === null || !window.turnstile) return null

  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    pendingResolve = (value) => finish(value)
    try {
      window.turnstile.reset(widgetId)
      window.turnstile.execute(widgetId)
    } catch {
      finish(null)
      return
    }
    window.setTimeout(() => finish(null), timeoutMs)
  })
}
