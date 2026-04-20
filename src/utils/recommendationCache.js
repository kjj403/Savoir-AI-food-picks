const KEY = 'food-app-reco-cache-v6'
const TTL_MS = 12 * 60 * 1000

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { entries: [] }
    const data = JSON.parse(raw)
    return data && typeof data === 'object' && Array.isArray(data.entries)
      ? data
      : { entries: [] }
  } catch {
    return { entries: [] }
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* quota */
  }
}

export function inputKey(values) {
  return JSON.stringify({
    w: values.weather,
    h: values.hunger,
    m: values.mood,
    b: values.budget,
  })
}

/** @returns {object | null} */
export function getCachedRecommendation(values) {
  const { entries } = read()
  const k = inputKey(values)
  const entry = entries.find((e) => e.key === k)
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) return null
  return entry.payload ?? null
}

export function setCachedRecommendation(values, payload) {
  const data = read()
  const k = inputKey(values)
  const next = [
    {
      key: k,
      payload,
      at: Date.now(),
    },
    ...data.entries.filter((e) => e.key !== k),
  ].slice(0, 10)
  write({ entries: next })
}

export function invalidateCacheForInput(values) {
  const data = read()
  const k = inputKey(values)
  write({ entries: data.entries.filter((e) => e.key !== k) })
}
