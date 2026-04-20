import { useCallback, useMemo, useState } from 'react'

function heatBadge(heat) {
  const h = String(heat || '중불')
  if (h.includes('강') || h.includes('high')) return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-100'
  if (h.includes('약') || h.includes('low')) return 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-100'
  return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100'
}

function IngredientChecklist({ ingredients }) {
  const [done, setDone] = useState(() => new Set())

  const toggle = useCallback((i) => {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }, [])

  if (!ingredients?.length) return null

  return (
    <div>
      <h5 className="font-bold text-slate-900 dark:text-white">재료 (눌러 체크)</h5>
      <ul className="mt-2 space-y-2">
        {ingredients.map((ing, i) => {
          const checked = done.has(i)
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  checked
                    ? 'border-emerald-400 bg-emerald-50/90 line-through opacity-75 dark:border-emerald-600 dark:bg-emerald-950/40'
                    : 'border-violet-200/80 bg-white/90 hover:border-violet-400 dark:border-slate-600 dark:bg-slate-800/80'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold ${
                    checked
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-500'
                  }`}
                  aria-hidden
                >
                  {checked ? '✓' : ''}
                </span>
                <span>
                  <span className="font-semibold text-slate-900 dark:text-white">{ing.item}</span>
                  {ing.qty ? (
                    <span className="text-slate-600 dark:text-slate-400"> — {ing.qty}</span>
                  ) : null}
                  {ing.note ? (
                    <span className="mt-0.5 block text-xs text-violet-700 dark:text-violet-300">
                      {ing.note}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StepAccordion({ steps }) {
  const [open, setOpen] = useState(() => new Set([0]))

  if (!steps?.length) return null

  return (
    <div>
      <h5 className="font-bold text-slate-900 dark:text-white">조리 단계</h5>
      <ol className="mt-2 space-y-2">
        {steps.map((step, i) => {
          const isOpen = open.has(i)
          return (
            <li key={i} className="rounded-xl border border-violet-200/70 bg-white/85 dark:border-slate-600 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() =>
                  setOpen((prev) => {
                    const next = new Set(prev)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    return next
                  })
                }
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
              >
                <span className="text-sm font-bold text-violet-950 dark:text-violet-100">
                  {step.index ?? i + 1}. {step.instruction?.slice(0, 42)}
                  {(step.instruction?.length ?? 0) > 42 ? '…' : ''}
                </span>
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                  {isOpen ? '접기' : '펼치기'}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-violet-100 px-3 pb-3 pt-2 text-sm leading-relaxed dark:border-slate-600">
                  <p className="text-slate-800 dark:text-slate-100">{step.instruction}</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold dark:bg-slate-700">
                      준비 {step.prepMinutes}분
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-semibold ${heatBadge(step.heat)}`}
                    >
                      🔥 {step.heat}
                    </span>
                  </div>
                  {step.technique && (
                    <p className="rounded-lg bg-violet-50/90 px-2 py-1.5 text-xs text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                      <span className="font-bold">기법: </span>
                      {step.technique}
                    </p>
                  )}
                  {step.proTip && (
                    <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50">
                      <span className="font-bold">팁: </span>
                      {step.proTip}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function HomeRecipePanel({
  open,
  onToggle,
  loading,
  recipe,
  onLoad,
  onShareCopy,
  shareFeedback,
  onVariant,
  variantLoading = null,
}) {
  const timeLine = useMemo(() => {
    if (!recipe) return ''
    const p = recipe.prepMinutes ?? 0
    const c = recipe.cookMinutes ?? 0
    const t = recipe.totalMinutes ?? p + c
    return `준비 ${p}분 + 조리 ${c}분 = 총 약 ${t}분`
  }, [recipe])

  return (
    <section className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/50 dark:border-violet-800/50 dark:bg-violet-950/30">
      <button
        type="button"
        onClick={() => {
          onToggle?.(!open)
          if (!open && !recipe && !loading) onLoad?.()
        }}
        className="flex w-full min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-bold text-violet-950 dark:text-violet-100"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🍳</span>
          집에서 요리하기
        </span>
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {open ? '접기' : '펼치기'}
        </span>
      </button>

      {open && (
        <div className="border-t border-violet-200/60 px-4 pb-4 pt-2 dark:border-violet-800/50">
          {loading && (
            <p className="py-4 text-center text-sm text-violet-900 dark:text-violet-200">
              레시피를 짜는 중… (단계별 시간·불 세기 포함)
            </p>
          )}
          {!loading && recipe && (
            <RecipeBody
              recipe={recipe}
              timeLine={timeLine}
              onShareCopy={onShareCopy}
              shareFeedback={shareFeedback}
              onVariant={onVariant}
              variantLoading={variantLoading}
            />
          )}
          {!loading && !recipe && (
            <p className="py-2 text-sm text-violet-900/90 dark:text-violet-200/90">
              버튼을 눌러 초보자용 레시피를 불러와요.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function RecipeBody({ recipe, timeLine, onShareCopy, shareFeedback, onVariant, variantLoading }) {
  return (
    <div className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
      {variantLoading && (
        <div
          className="rounded-xl border border-violet-300 bg-violet-100/90 px-3 py-2 text-center text-sm font-semibold text-violet-950 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100"
          role="status"
        >
          {variantLoading === 'spicier' ? '🌶️ 더 맵게' : '🥗 더 건강하게'} 버전으로 다시 짜는 중…
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/90 px-2 py-1 font-semibold dark:bg-slate-800">
          ⏱ {timeLine}
        </span>
        <span className="rounded-full bg-white/90 px-2 py-1 font-semibold dark:bg-slate-800">
          난이도 {recipe.difficulty ?? '—'}
        </span>
      </div>

      {onVariant && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={variantLoading === 'spicier'}
            onClick={() => onVariant?.('spicier')}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border-2 border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-900 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100"
          >
            {variantLoading === 'spicier' ? '…' : '🌶️ 더 맵게'}
          </button>
          <button
            type="button"
            disabled={variantLoading === 'healthier'}
            onClick={() => onVariant?.('healthier')}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            {variantLoading === 'healthier' ? '…' : '🥗 더 건강하게'}
          </button>
        </div>
      )}

      <IngredientChecklist ingredients={recipe.ingredients} />
      <StepAccordion steps={recipe.steps} />

      {recipe.savingTips && (
        <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800/80">
          <h5 className="font-bold text-slate-900 dark:text-white">💰 예산 꿀팁</h5>
          <p className="mt-1 leading-relaxed">{recipe.savingTips}</p>
        </div>
      )}

      {recipe.substitutions && (
        <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800/80">
          <h5 className="font-bold text-slate-900 dark:text-white">바꿔 써도 좋아요</h5>
          <p className="mt-1 leading-relaxed">{recipe.substitutions}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onShareCopy}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900 hover:bg-violet-50 dark:border-violet-600 dark:bg-slate-800 dark:text-violet-100 dark:hover:bg-slate-700"
      >
        레시피 텍스트 복사
      </button>
      {shareFeedback && (
        <p className="text-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {shareFeedback}
        </p>
      )}
    </div>
  )
}
