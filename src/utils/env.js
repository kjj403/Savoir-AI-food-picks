/** Whether Vite will expose an OpenAI key to the client bundle. */
export function hasApiKey() {
  return Boolean(String(import.meta.env.VITE_OPENAI_API_KEY ?? '').trim())
}
