function enc(s) {
  return encodeURIComponent(String(s).trim())
}

/** YouTube search for recipe videos */
export function youtubeRecipeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${enc(query + ' 레시피')}`
}

/** Kakao Map search (web) */
export function kakaoMapSearchUrl(query) {
  return `https://map.kakao.com/link/search/${enc(query)}`
}

export function coupangSearchUrl(query) {
  return `https://www.coupang.com/np/search?q=${enc(query)}`
}

export function kurlySearchUrl(query) {
  return `https://www.kurly.com/search?keyword=${enc(query)}`
}
