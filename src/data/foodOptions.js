export const WEATHER = [
  { id: 'sunny', emoji: '☀️', label: 'Sunny & bright' },
  { id: 'rainy', emoji: '🌧️', label: 'Rainy / cozy' },
  { id: 'cold', emoji: '❄️', label: 'Cold & crisp' },
  { id: 'humid', emoji: '💨', label: 'Hot & humid' },
  { id: 'mild', emoji: '🌤️', label: 'Mild & breezy' },
]

export const HUNGER = [
  { id: 'snack', emoji: '🥄', label: 'Light snack' },
  { id: 'regular', emoji: '🍽️', label: 'Solid meal' },
  { id: 'hangry', emoji: '🤤', label: 'Very hungry' },
  { id: 'feast', emoji: '🎉', label: 'Feast mode' },
]

export const MOOD = [
  { id: 'happy', emoji: '😊', label: 'Happy' },
  { id: 'cozy', emoji: '🛋️', label: 'Cozy / lazy' },
  { id: 'hype', emoji: '🔥', label: 'Hyped up' },
  { id: 'chill', emoji: '😌', label: 'Chill vibes' },
  { id: 'celebrate', emoji: '🥳', label: 'Celebrating' },
]

export const BUDGET = [
  { id: 'budget', emoji: '💸', label: 'Budget' },
  { id: 'moderate', emoji: '💰', label: 'Moderate' },
  { id: 'treat', emoji: '✨', label: 'Treat yourself' },
  { id: 'splurge', emoji: '👑', label: 'Splurge' },
]

export const defaultInputValues = {
  weather: WEATHER[0].id,
  hunger: HUNGER[1].id,
  mood: MOOD[0].id,
  budget: BUDGET[1].id,
}
