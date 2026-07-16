const { AiInteractionLog } = require('../models/DBmodels')

const logAiInteraction = async ({
  userId = null,
  feature,
  operation,
  sessionType = null,
  sessionId = null,
  tripId = null,
  model = null,
  systemPrompt = null,
  userPrompt = null,
  requestMessages = null,
  requestPayload = null,
  rawResponse = null,
  parsedResponse = null,
  tokenUsage = null,
  status = 'success',
  errorMessage = null
}) => {
  try {
    return await AiInteractionLog.create({
      userId,
      feature,
      operation,
      sessionType,
      sessionId,
      tripId,
      model,
      systemPrompt,
      userPrompt,
      requestMessages,
      requestPayload,
      rawResponse,
      parsedResponse,
      tokenUsage,
      status,
      errorMessage
    })
  } catch (error) {
    console.error('Failed to persist AI interaction log:', error.message)
    return null
  }
}

module.exports = {
  logAiInteraction
}
