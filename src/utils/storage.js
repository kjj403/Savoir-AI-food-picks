const STORAGE_KEY = 'food-app-liked-food-history'

function normalizeFood(food) {
  return String(food).trim().toLowerCase()
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeAll(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* quota */
  }
}

/**
 * @param {string} food
 * @param {Date | string} [date]
 * @param {{ calories?: number, sodium?: number }} [extras]
 */
export function saveToHistory(food, date = new Date(), extras = {}) {
  const items = readAll()
  const iso =
    date instanceof Date
      ? date.toISOString()
      : typeof date === 'string'
        ? new Date(date).toISOString()
        : new Date().toISOString()

  const row = {
    id: crypto.randomUUID(),
    food: String(food).trim(),
    date: iso,
  }
  if (typeof extras.calories === 'number' && Number.isFinite(extras.calories)) {
    row.calories = Math.round(extras.calories)
  }
  if (typeof extras.sodium === 'number' && Number.isFinite(extras.sodium)) {
    row.sodium = Math.round(extras.sodium)
  }

  items.push(row)

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const pruned = items.filter((e) => new Date(e.date).getTime() >= cutoff)
  writeAll(pruned)
}

/** @returns {Array<{ id: string, food: string, date: string, calories?: number, sodium?: number }>} */
export function getHistory() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return readAll()
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** True if this food was saved 3+ times in the last 7 days */
export function checkRepeat(food) {
  const key = normalizeFood(food)
  if (!key) return false
  const items = getHistory()
  const count = items.filter((e) => normalizeFood(e.food) === key).length
  return count >= 3
}
