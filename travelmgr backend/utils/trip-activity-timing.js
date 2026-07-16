const { isTransportTypeId } = require('./activity-types')
const { ensureActivityAfterArrival } = require('./itinerary-scheduler')

const getLatestTransportEndBefore = (activities, activity) => {
  const actStart = activity.startDateTime ? new Date(activity.startDateTime) : null
  if (!actStart || Number.isNaN(actStart.getTime())) return null

  let latestEnd = null
  for (const candidate of activities) {
    if (!isTransportTypeId(candidate.activityTypeId)) continue
    if (candidate.id && activity.id && candidate.id === activity.id) continue
    const end = candidate.endDateTime ? new Date(candidate.endDateTime) : null
    if (!end || Number.isNaN(end.getTime()) || end > actStart) continue
    if (!latestEnd || end > latestEnd) latestEnd = end
  }

  return latestEnd ? latestEnd.toISOString() : null
}

const enforceStageActivityTiming = (activities) => {
  const updates = []

  for (const activity of activities) {
    if (isTransportTypeId(activity.activityTypeId)) continue
    const arrivalEnd = getLatestTransportEndBefore(activities, activity)
    if (!arrivalEnd) continue

    const beforeStart = activity.startDateTime
    const beforeEnd = activity.endDateTime
    ensureActivityAfterArrival(activity, arrivalEnd)

    if (activity.startDateTime !== beforeStart || activity.endDateTime !== beforeEnd) {
      updates.push(activity)
    }
  }

  return updates
}

const enforceTripActivityTransportTiming = async (tripId) => {
  const { Stage, Activity } = require('../models/DBmodels')
  const stages = await Stage.findAll({ where: { tripId }, order: [['id', 'ASC']] })
  let adjusted = 0

  for (const stage of stages) {
    const activities = await Activity.findAll({ where: { stageId: stage.id } })
    const plain = activities.map((row) => row.toJSON())
    const changed = enforceStageActivityTiming(plain)

    for (const activity of changed) {
      await Activity.update(
        {
          startDateTime: activity.startDateTime,
          endDateTime: activity.endDateTime
        },
        { where: { id: activity.id } }
      )
      adjusted += 1
    }
  }

  return adjusted
}

module.exports = {
  getLatestTransportEndBefore,
  enforceStageActivityTiming,
  enforceTripActivityTransportTiming
}
