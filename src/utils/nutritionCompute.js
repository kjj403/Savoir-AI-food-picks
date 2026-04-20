import { DRI } from '../constants/nutritionDri'

/** @param {number} pct 0-100+ */
export function levelForPct(pct) {
  if (pct <= 45) return 'good'
  if (pct <= 85) return 'moderate'
  return 'high'
}

export function pctOfDri(value, dri) {
  if (!Number.isFinite(value) || !Number.isFinite(dri) || dri <= 0) return 0
  return Math.min(150, Math.round((value / dri) * 100))
}

/**
 * Derive badges from macros (Korean).
 * @param {{ calories: number, carbs: number, protein: number, fat: number, sodium: number }} n
 */
export function deriveNutritionBadges(n) {
  if (!n) return []
  const badges = []
  const carbPct = pctOfDri(n.carbs, DRI.carbsG)
  const protPct = pctOfDri(n.protein, DRI.proteinG)
  const fatPct = pctOfDri(n.fat, DRI.fatG)
  const naPct = pctOfDri(n.sodium, DRI.sodiumMg)
  const calPct = pctOfDri(n.calories, DRI.calories)

  if (carbPct >= 55) badges.push({ key: 'carb', label: '🔥 탄수 비중 높음', tone: 'amber' })
  if (protPct >= 45) badges.push({ key: 'protein', label: '💪 단백질 충분', tone: 'emerald' })
  if (protPct <= 18 && n.protein < 15) badges.push({ key: 'lowprot', label: '💪 단백질 낮음', tone: 'slate' })
  if (fatPct >= 50) badges.push({ key: 'fat', label: '🧈 지방 비중 높음', tone: 'orange' })
  if (naPct >= 55) badges.push({ key: 'na', label: '🧂 나트륨 주의', tone: 'red' })
  if (calPct >= 55 && calPct < 85) badges.push({ key: 'cal', label: '⚡ 한 끼 칼로리 묵직', tone: 'yellow' })
  if (calPct >= 85) badges.push({ key: 'calhi', label: '🔥 칼로리 한 끼로 큼', tone: 'rose' })
  return badges.slice(0, 4)
}
