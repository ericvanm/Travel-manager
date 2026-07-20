const { listDateRange, parseDateOnly, MAX_TRIP_DAYS } = require('./date-only')
const { wallClockDateInTimezone, wallClockTimeInTimezone } = require('./datetime-timezone')

const TRANSPORT_TYPE_IDS = new Set([6, 8, 9, 10, 11, 12])
const HOTEL_TYPE_ID = 7

const stageTimezone = (stage) => stage?.Country?.timezone || 'UTC'

const stageTimelineRef = (stage) => {
  if (!stage) return null
  return {
    id: stage.id,
    name: stage.name,
    timezone: stageTimezone(stage)
  }
}

const activityStageRef = (activity, stages) =>
  stageTimelineRef(stages.find((s) => s.id === activity.stageId))

const getRelevantSortTime = (activity, dateStr, stages) => {
  if (!activity.startDateTime) return '00:00'
  const activityStage = stages.find((s) => s.id === activity.stageId)
  const tz = stageTimezone(activityStage)
  const actStartDate = wallClockDateInTimezone(activity.startDateTime, tz)
  const actEndDate = wallClockDateInTimezone(activity.endDateTime || activity.startDateTime, tz)

  if (TRANSPORT_TYPE_IDS.has(activity.activityTypeId) || activity.activityTypeId === HOTEL_TYPE_ID) {
    if (actStartDate === dateStr) {
      return wallClockTimeInTimezone(activity.startDateTime, tz) || '00:00'
    }
    if (actEndDate === dateStr) {
      return wallClockTimeInTimezone(activity.endDateTime, tz) || '00:00'
    }
  }

  return wallClockTimeInTimezone(activity.startDateTime, tz) || '00:00'
}

const buildDayActivities = (dateStr, stages, activities, currentStage) => {
  const dayActivities = []

  for (const activity of activities) {
    const activityStage = stages.find((s) => s.id === activity.stageId)
    const stageInfo = activityStageRef(activity, stages)

    if (!activity.startDateTime || !activity.endDateTime) {
      if (activityStage && currentStage && activityStage.id === currentStage.id) {
        dayActivities.push({
          ...activity,
          status: 'continues',
          stage: stageInfo
        })
      }
      continue
    }

    const tz = stageTimezone(activityStage)
    const actStartDate = wallClockDateInTimezone(activity.startDateTime, tz)
    const actEndDate = wallClockDateInTimezone(activity.endDateTime, tz)
    if (!actStartDate || !actEndDate) continue

    if (actStartDate === dateStr && actEndDate === dateStr) {
      const startTime = wallClockTimeInTimezone(activity.startDateTime, tz)
      const endTime = wallClockTimeInTimezone(activity.endDateTime, tz)
      if (startTime !== endTime) {
        dayActivities.push({ ...activity, status: 'starts', stage: stageInfo })
        dayActivities.push({ ...activity, status: 'ends', stage: stageInfo })
      } else {
        dayActivities.push({ ...activity, status: 'starts_ends', stage: stageInfo })
      }
      continue
    }

    if (actStartDate === dateStr && actEndDate !== dateStr) {
      dayActivities.push({ ...activity, status: 'starts', stage: stageInfo })
      continue
    }

    if (actEndDate === dateStr && actStartDate !== dateStr) {
      dayActivities.push({ ...activity, status: 'ends', stage: stageInfo })
      continue
    }

    if (actStartDate < dateStr && actEndDate > dateStr) {
      dayActivities.push({ ...activity, status: 'continues', stage: stageInfo })
    }
  }

  dayActivities.sort((a, b) =>
    getRelevantSortTime(a, dateStr, stages).localeCompare(getRelevantSortTime(b, dateStr, stages))
  )

  return dayActivities
}

const buildTripTimeline = (stages, activities) => {
  const validStages = stages.filter((s) => s.startDate && s.endDate)
  if (validStages.length === 0) return []

  const startDates = validStages.map((s) => parseDateOnly(s.startDate)).filter(Boolean)
  const endDates = validStages.map((s) => parseDateOnly(s.endDate)).filter(Boolean)
  if (startDates.length === 0 || endDates.length === 0) return []

  const tripStart = startDates.sort()[0]
  const tripEnd = endDates.sort().slice(-1)[0]
  const dayStrings = listDateRange(tripStart, tripEnd, MAX_TRIP_DAYS)

  return dayStrings.map((dateStr) => {
    const currentStage = stages.find((stage) => {
      const stageStart = parseDateOnly(stage.startDate)
      const stageEnd = parseDateOnly(stage.endDate)
      return stageStart && stageEnd && stageStart <= dateStr && dateStr <= stageEnd
    })

    return {
      date: dateStr,
      stage: stageTimelineRef(currentStage),
      activities: buildDayActivities(dateStr, stages, activities, currentStage)
    }
  })
}

module.exports = {
  buildTripTimeline,
  stageTimezone,
  wallClockDateInTimezone,
  wallClockTimeInTimezone
}
