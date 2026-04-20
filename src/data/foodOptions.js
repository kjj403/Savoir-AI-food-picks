export const WEATHER = [
  { id: 'sunny', emoji: '☀️', label: '맑고 화창' },
  { id: 'rainy', emoji: '🌧️', label: '비 오는 날' },
  { id: 'cold', emoji: '❄️', label: '춥고 상쾌' },
  { id: 'humid', emoji: '💨', label: '덥고 습함' },
  { id: 'mild', emoji: '🌤️', label: '선선한 바람' },
]

export const HUNGER = [
  { id: 'snack', emoji: '🥄', label: '가벼운 간식' },
  { id: 'regular', emoji: '🍽️', label: '든든한 한 끼' },
  { id: 'hangry', emoji: '🤤', label: '엄청 배고픔' },
  { id: 'feast', emoji: '🎉', label: '배 터질 만큼' },
]

export const MOOD = [
  { id: 'happy', emoji: '😊', label: '기분 최고' },
  { id: 'cozy', emoji: '🛋️', label: '늘어지고 싶음' },
  { id: 'hype', emoji: '🔥', label: '들떠 있음' },
  { id: 'chill', emoji: '😌', label: '느긋함' },
  { id: 'celebrate', emoji: '🥳', label: '축하하는 날' },
]

export const BUDGET = [
  { id: 'budget', emoji: '💸', label: '알뜰하게' },
  { id: 'moderate', emoji: '💰', label: '적당한 편' },
  { id: 'treat', emoji: '✨', label: '가끔은 플렉스' },
  { id: 'splurge', emoji: '👑', label: '기분 내야 할 때' },
]

/** 한식 / 중식 / 일식 / 양식 — 아무거나는 제약 없음 */
export const CUISINE = [
  { id: 'korean', emoji: '🍚', label: '한식' },
  { id: 'chinese', emoji: '🥟', label: '중식' },
  { id: 'japanese', emoji: '🍣', label: '일식' },
  { id: 'western', emoji: '🍝', label: '양식' },
  { id: 'any', emoji: '🎲', label: '아무거나' },
]

/** 운동과 식사 타이밍 연결 */
export const EXERCISE_LINK = [
  { id: 'none', emoji: '😐', label: '보통' },
  { id: 'before', emoji: '🏃', label: '운동 전' },
  { id: 'after', emoji: '💪', label: '운동 후' },
  { id: 'rest', emoji: '🛋️', label: '휴식일' },
]

/** 선호 영양 포인트 */
export const NUTRIENT_FOCUS = [
  { id: 'balanced', emoji: '⚖️', label: '균형' },
  { id: 'high_protein', emoji: '🥩', label: '단백질' },
  { id: 'more_veggies', emoji: '🥬', label: '채소·섬유' },
  { id: 'low_sodium', emoji: '🧂', label: '저염' },
  { id: 'lighter', emoji: '🥗', label: '가볍게' },
]

export const defaultInputValues = {
  weather: WEATHER[0].id,
  hunger: HUNGER[1].id,
  mood: MOOD[0].id,
  budget: BUDGET[1].id,
  cuisine: CUISINE[4].id,
  allergies: '',
  dislikes: '',
  exerciseTiming: EXERCISE_LINK[0].id,
  nutrientFocus: NUTRIENT_FOCUS[0].id,
}
