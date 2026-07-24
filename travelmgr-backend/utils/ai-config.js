const isOpenAIEnabled = () =>
  Boolean(process.env.OPENAI_API_KEY && process.env.USE_OPENAI === 'true')

/** Blocks AI routes when OpenAI is not configured (skipped in test for CI fallback flows). */
const requireAiEnabled = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next()
  }
  if (!isOpenAIEnabled()) {
    return res.status(503).json({ error: 'ai_disabled' })
  }
  return next()
}

module.exports = {
  isOpenAIEnabled,
  requireAiEnabled
}
