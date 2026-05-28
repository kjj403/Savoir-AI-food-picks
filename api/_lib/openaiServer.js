import OpenAI from 'openai'

let cached = null

export function getServerOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set on the server.')
  }
  if (!cached) cached = new OpenAI({ apiKey })
  return cached
}
