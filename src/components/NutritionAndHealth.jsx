import { DRI } from '../constants/nutritionDri'
import { deriveNutritionBadges, levelForPct, pctOfDri } from '../utils/nutritionCompute'

function toneClass(level) {
  if (level === 'good') return 'bg-emerald-500'
  if (level === 'moderate') return 'bg-amber-400'
  return 'bg-rose-500'
}

function DriBar({ label, value, unit, dri, emoji }) {
  const pct = pctOfDri(value, dri)
  const level = levelForPct(pct)
  const w = Math.min(100, pct)
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
        <span className="truncate">
          {emoji} {label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-800 dark:text-slate-200">
          {Math.round(value)}
          {unit} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${toneClass(level)}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  )
}

function MacroDonut({ carbs, protein, fat }) {
  const cCal = Math.max(0, carbs) * 4
  const pCal = Math.max(0, protein) * 4
  const fCal = Math.max(0, fat) * 9
  const t = cCal + pCal + fCal || 1
  const cDeg = (cCal / t) * 360
  const pDeg = (pCal / t) * 360
  const cEnd = cDeg
  const pEnd = cDeg + pDeg
  const grad = `conic-gradient(from -90deg, #f59e0b 0deg ${cEnd}deg, #10b981 ${cEnd}deg ${pEnd}deg, #6366f1 ${pEnd}deg 360deg)`

  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 lg:gap-10">
      <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
        <div
          className="h-full w-full rounded-full p-[10px] shadow-inner"
          style={{ background: grad }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center dark:bg-slate-900">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">매크로</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">칼로리 비율</p>
            </div>
          </div>
        </div>
      </div>
      <ul className="flex flex-1 flex-wrap justify-center gap-3 text-[11px] sm:justify-end sm:text-sm">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 탄수 {Math.round((cCal / t) * 100)}%
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 단백{' '}
          {Math.round((pCal / t) * 100)}%
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> 지방 {Math.round((fCal / t) * 100)}%
        </li>
      </ul>
    </div>
  )
}

function NutCard({ label, value, unit, accent }) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-xl border px-2 py-2 text-center sm:px-2.5 sm:py-2.5 ${accent ?? 'border-orange-100 bg-white/90 dark:border-slate-600 dark:bg-slate-800/80'}`}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex min-h-[2.25rem] flex-wrap items-baseline justify-center gap-x-0.5 gap-y-0">
        <span className="max-w-full break-all text-sm font-bold tabular-nums leading-tight text-slate-900 dark:text-white sm:text-base">
          {value}
        </span>
        <span className="shrink-0 text-[10px] font-semibold leading-none text-slate-500 dark:text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  )
}

export function NutritionAndHealth({
  nutrition,
  healthInsight,
  warning,
  comparison,
  modelBadges = [],
}) {
  const n = nutrition
  const sodiumHigh = n && typeof n.sodium === 'number' && pctOfDri(n.sodium, DRI.sodiumMg) >= 55

  const derived = n ? deriveNutritionBadges(n) : []
  const badgeLabels = new Set([
    ...modelBadges.filter(Boolean).slice(0, 4),
    ...derived.map((d) => d.label),
  ])

  const ratioText =
    comparison?.summary ||
    (comparison?.calorieRatio != null && n
      ? `참고 음식(${comparison.referenceFood}) 대비 칼로리 약 ${comparison.calorieRatio < 1 ? `${Math.round((1 / comparison.calorieRatio) * 10) / 10}배 가벼운 편` : '비슷하거나 높을 수 있어요'}`
      : '')

  const sodiumPct =
    healthInsight?.sodiumPercentOfDaily != null
      ? healthInsight.sodiumPercentOfDaily
      : n
        ? pctOfDri(n.sodium, DRI.sodiumMg)
        : null

  if (!n && !healthInsight?.hook && !warning) return null

  return (
    <div className="mt-5 space-y-4">
      {n && (
        <section aria-labelledby="nutrition-heading">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h4
              id="nutrition-heading"
              className="text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              영양 (1인분 추정)
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              참고치 대비 %는 성인 기준 단순 비교예요
            </span>
          </div>

          {badgeLabels.size > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[...badgeLabels].map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-orange-200/90 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-orange-100/90 bg-white/80 p-4 sm:p-5 lg:p-6 dark:border-slate-600 dark:bg-slate-800/80">
            <MacroDonut carbs={n.carbs} protein={n.protein} fat={n.fat} />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            <NutCard label="칼로리" value={Math.round(n.calories ?? 0)} unit="kcal" />
            <NutCard label="탄수화물" value={Math.round(n.carbs ?? 0)} unit="g" />
            <NutCard label="단백질" value={Math.round(n.protein ?? 0)} unit="g" />
            <NutCard label="지방" value={Math.round(n.fat ?? 0)} unit="g" />
            <NutCard
              label="나트륨"
              value={Math.round(n.sodium ?? 0)}
              unit="mg"
              accent={
                sodiumHigh
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50'
                  : undefined
              }
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 sm:p-4 dark:border-slate-600 dark:bg-slate-900/60 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2 lg:space-y-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 lg:col-span-2">
              하루 권장량 대비 (대략)
            </p>
            <DriBar label="칼로리" value={n.calories} unit="kcal" dri={DRI.calories} emoji="🔥" />
            <DriBar label="탄수화물" value={n.carbs} unit="g" dri={DRI.carbsG} emoji="🌾" />
            <DriBar label="단백질" value={n.protein} unit="g" dri={DRI.proteinG} emoji="🥩" />
            <DriBar label="지방" value={n.fat} unit="g" dri={DRI.fatG} emoji="🧈" />
            <DriBar label="나트륨" value={n.sodium} unit="mg" dri={DRI.sodiumMg} emoji="🧂" />
          </div>

          {ratioText && (
            <p className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/90 px-3 py-2 text-xs leading-relaxed text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100">
              <span className="font-bold">비교: </span>
              {ratioText}
              {comparison?.referenceFood ? (
                <span className="block text-[11px] text-blue-800/90 dark:text-blue-200/90">
                  기준: {comparison.referenceFood}
                </span>
              ) : null}
            </p>
          )}
        </section>
      )}

      {(healthInsight?.hook || healthInsight?.bestTimeToEat || healthInsight?.goalConnection) && (
        <section
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/40"
          aria-labelledby="health-heading"
        >
          <h4
            id="health-heading"
            className="text-xs font-bold text-emerald-900 dark:text-emerald-100"
          >
            맞춤 건강 인사이트
          </h4>
          {healthInsight.hook && (
            <p className="mt-1.5 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-100/95">
              {healthInsight.hook}
            </p>
          )}
          {sodiumPct != null && (
            <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs font-medium text-emerald-900 dark:bg-emerald-100/10 dark:text-emerald-50">
              나트륨: 일일 참고치(2,300mg) 대략 <span className="tabular-nums font-bold">{sodiumPct}%</span>
            </p>
          )}
          {healthInsight.bestTimeToEat && (
            <p className="mt-2 text-xs font-medium text-emerald-900 dark:text-emerald-100">
              ⏱ {healthInsight.bestTimeToEat}
            </p>
          )}
          {healthInsight.goalConnection && (
            <p className="mt-1.5 text-xs leading-relaxed text-emerald-950/90 dark:text-emerald-100/90">
              {healthInsight.goalConnection}
            </p>
          )}
        </section>
      )}

      {warning && (
        <section
          className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-sm dark:border-amber-800/70 dark:bg-amber-950/35"
          aria-labelledby="warn-heading"
        >
          <h4 id="warn-heading" className="text-xs font-bold text-amber-950 dark:text-amber-100">
            주의할 점
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-950/95 dark:text-amber-50/95">
            {warning}
          </p>
        </section>
      )}
    </div>
  )
}
