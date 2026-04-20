export function AlternativeMeals({ alternatives = [] }) {
  if (!alternatives.length) return null
  return (
    <section className="mt-4" aria-label="비슷한 대안 메뉴">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        다른 선택
      </h4>
      <div className="-mx-1 flex flex-col gap-3 pb-2 pt-1 sm:flex-row sm:overflow-x-auto sm:[scrollbar-width:thin]">
        {alternatives.map((a, i) => (
          <div
            key={`${a.name}-${i}`}
            className="w-full shrink-0 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md dark:border-slate-600 dark:bg-slate-800/90 sm:w-[min(260px,85vw)]"
          >
            <p className="font-bold text-slate-900 dark:text-white">{a.name}</p>
            {a.oneLiner && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {a.oneLiner}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
