import { runGuards } from './_lib/guards.js'
import { getServerOpenAI } from './_lib/openaiServer.js'
import { RECIPE_SYSTEM, buildRecipeUserPrompt } from './_lib/prompts.js'
import { validateRecipeBody } from './_lib/validate.js'

export default async function handler(req, res) {
  const guard = await runGuards(req, res)
  if (guard.handled) return

  const validationError = validateRecipeBody(guard.body)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  const { dish, reasonSummary, values, variant } = guard.body

  let client
  try {
    client = getServerOpenAI()
  } catch (e) {
    res.status(500).json({ error: 'server:openai-config', message: e.message })
    return
  }

  const userPrompt = buildRecipeUserPrompt({ dish, reasonSummary, values, variant })

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RECIPE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    })
    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      res.status(502).json({ error: 'openai:parse' })
      return
    }
    res.status(200).json({ data: parsed })
  } catch (e) {
    const status = e?.status ?? e?.response?.status ?? 500
    const message = e?.error?.message ?? e?.message ?? 'OpenAI request failed.'
    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: 'openai:request',
      message,
    })
  }
}
