function stepLine(step, i) {
  if (typeof step === 'string') return `${i + 1}. ${step}`
  const s = step || {}
  const bits = [
    `${i + 1}. ${s.instruction || ''}`,
    s.heat ? `[${s.heat}]` : '',
    s.prepMinutes != null ? `(${s.prepMinutes}분)` : '',
    s.technique ? `기법: ${s.technique}` : '',
    s.proTip ? `팁: ${s.proTip}` : '',
  ].filter(Boolean)
  return bits.join(' ')
}

/** @param {object} recipe */
export function formatRecipeForShare(dish, recipe) {
  if (!recipe) return ''
  const prep = recipe.prepMinutes ?? '?'
  const cook = recipe.cookMinutes ?? '?'
  const total = recipe.totalMinutes ?? '?'
  const lines = [
    `🍳 ${recipe.title || dish}`,
    `⏱ 준비 ${prep}분 + 조리 ${cook}분 (총 약 ${total}분) · 난이도 ${recipe.difficulty ?? '—'}`,
    '',
    '【재료】',
    ...(recipe.ingredients || []).map((i) =>
      `· ${i.item}${i.qty ? ` (${i.qty})` : ''}${i.note ? ` — ${i.note}` : ''}`,
    ),
    '',
    '【만드는 순서】',
    ...(recipe.steps || []).map((s, i) => stepLine(s, i)),
  ]
  if (recipe.savingTips) {
    lines.push('', '【예산 팁】', recipe.savingTips)
  }
  if (recipe.substitutions) {
    lines.push('', '【바꿔 쓰기】', recipe.substitutions)
  }
  lines.push('', '— Savoir 레시피')
  return lines.join('\n')
}
