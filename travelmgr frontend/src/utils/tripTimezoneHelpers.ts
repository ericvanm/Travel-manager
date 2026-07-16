import { Stage, TimelineStageRef } from '../types'

export const getStageTimezone = (
  stage?: Stage | TimelineStageRef | null,
  stages: Stage[] = []
): string => {
  if (stage && 'Country' in stage && stage.Country?.timezone) {
    return stage.Country.timezone
  }
  const full = stages.find((s) => s.id === stage?.id)
  return full?.Country?.timezone || 'UTC'
}

export const getActivityStageTimezone = (
  stageId: number | undefined,
  stages: Stage[] = []
): string => {
  const stage = stages.find((s) => s.id === stageId)
  return getStageTimezone(stage, stages)
}
