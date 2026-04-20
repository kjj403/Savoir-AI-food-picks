import {
  coupangSearchUrl,
  kakaoMapSearchUrl,
  kurlySearchUrl,
  youtubeRecipeSearchUrl,
} from '../utils/externalLinks'

export function ActionLinks({ dish }) {
  const q = String(dish || '').trim() || '맛집'
  const yt = youtubeRecipeSearchUrl(q)
  const map = kakaoMapSearchUrl(`${q} 맛집`)
  const coup = coupangSearchUrl(q)
  const kurly = kurlySearchUrl(q)

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <a
        href={yt}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-sm font-bold text-red-900 shadow-sm transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60 sm:min-w-[140px]"
      >
        <span aria-hidden>📺</span>
        유튜브 레시피 영상
      </a>
      <a
        href={map}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/90 px-3 py-2.5 text-sm font-bold text-sky-950 shadow-sm transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-950/70 sm:min-w-[140px]"
      >
        <span aria-hidden>📍</span>
        근처 맛집 찾기
      </a>
      <a
        href={coup}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50/90 px-3 py-2.5 text-sm font-bold text-orange-950 shadow-sm transition hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100 sm:min-w-[140px]"
      >
        <span aria-hidden>🛒</span>
        쿠팡 재료
      </a>
      <a
        href={kurly}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/90 px-3 py-2.5 text-sm font-bold text-purple-950 shadow-sm transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-100 sm:min-w-[140px]"
      >
        <span aria-hidden>🥬</span>
        컬리 재료
      </a>
    </div>
  )
}
