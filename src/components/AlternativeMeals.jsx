export function AlternativeMeals({ alternatives = [] }) {
  if (!alternatives.length) return null
  return (
    <section className="mt-4" aria-label="추천 메뉴와 어울리는 곁들임">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        함께 먹기 좋은 메뉴
      </h4>
      <div className="grid grid-cols-1 gap-2.5 pb-2 pt-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {alternatives.map((a, i) => (
          <div
            key={`${a.name}-${i}`}
            className="min-w-0 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-md dark:border-slate-600 dark:bg-slate-800/90"
          >
            <p className="break-words text-sm font-bold leading-snug text-slate-900 dark:text-white">
              {a.name}
            </p>
            {a.oneLiner && (
              <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {a.oneLiner}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
