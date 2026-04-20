import { WEATHER, HUNGER, MOOD, BUDGET, defaultInputValues } from '../data/foodOptions'

function OptionGrid({ title, options, field, value, onChange, disabled }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-base font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {options.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(field, opt.id)}
              aria-pressed={selected}
              className={[
                'group flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2.5 py-4 text-center transition-all duration-300 sm:min-h-[3rem] sm:px-3 sm:py-3',
                'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400',
                selected
                  ? 'border-orange-400 bg-gradient-to-br from-orange-100 to-amber-50 shadow-md ring-2 ring-orange-300/60 dark:from-orange-900/40 dark:to-amber-900/30 dark:ring-orange-500/40'
                  : 'border-white/70 bg-white/60 hover:border-orange-200 hover:bg-white/90 dark:border-slate-600 dark:bg-slate-800/70 dark:hover:border-orange-500/50 dark:hover:bg-slate-800',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.98]',
              ].join(' ')}
            >
              <span
                className="text-3xl transition-transform duration-300 group-hover:scale-110 sm:text-3xl"
                aria-hidden
              >
                {opt.emoji}
              </span>
              <span className="max-w-[100%] break-words text-xs font-medium leading-snug text-slate-800 dark:text-slate-100 sm:text-sm">
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function InputForm({
  values = defaultInputValues,
  onChange,
  onSubmit,
  disabled = false,
}) {
  function handleFieldChange(field, id) {
    onChange?.({ ...values, [field]: id })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.(values)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in-up w-full max-w-none rounded-3xl border border-white/60 bg-white/75 p-5 shadow-xl shadow-orange-200/40 backdrop-blur-md transition-colors sm:p-7 dark:border-slate-700/80 dark:bg-slate-900/75 dark:shadow-none"
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            What&apos;s the vibe today?
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
            한 줄마다 하나씩 골라 주세요. 손가락에 닿기 쉽게 크게 만들어 두었어요.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <OptionGrid
          title="Weather"
          options={WEATHER}
          field="weather"
          value={values.weather}
          onChange={handleFieldChange}
          disabled={disabled}
        />
        <OptionGrid
          title="Hunger level"
          options={HUNGER}
          field="hunger"
          value={values.hunger}
          onChange={handleFieldChange}
          disabled={disabled}
        />
        <OptionGrid
          title="Mood"
          options={MOOD}
          field="mood"
          value={values.mood}
          onChange={handleFieldChange}
          disabled={disabled}
        />
        <OptionGrid
          title="Budget"
          options={BUDGET}
          field="budget"
          value={values.budget}
          onChange={handleFieldChange}
          disabled={disabled}
        />
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="submit"
          disabled={disabled}
          className="btn-bounce-hover inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-orange-500/40 transition hover:shadow-2xl hover:shadow-orange-500/45 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[3.75rem] sm:max-w-none sm:px-12"
        >
          <span aria-hidden>✨</span>
          {disabled ? '맛 찾는 중…' : 'Surprise me'}
        </button>
      </div>
    </form>
  )
}
