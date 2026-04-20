import OpenAI from 'openai'
import { hasApiKey } from '../utils/env'

/**
 * OpenAI client for the browser. Keys in Vite must use the VITE_ prefix and are
 * visible in the client bundle—use only for local demos; production apps should
 * call OpenAI from a backend.
 */
export function getOpenAIClient() {
  if (!hasApiKey()) {
    throw new Error(
      'API 키가 없어요. 프로젝트 루트의 .env에 VITE_OPENAI_API_KEY를 설정해 주세요.',
    )
  }
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
}

export { hasApiKey }
