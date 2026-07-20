import React from 'react'
import { Typography } from '@mui/material'
import { PlannedItinerary } from '../../services/ai-planning'
import { useLanguage } from '../../contexts/LanguageContext'
import TravelMap from '../shared/TravelMap'

interface Props {
  itinerary: PlannedItinerary
  currency: string
}

export const TripPlanningMap: React.FC<Props> = ({ itinerary, currency }) => {
  const { t } = useLanguage()

  const mapPoints = (itinerary.mapPoints || []).map((p) => ({
    ...p,
    type: p.type as 'departure' | 'stage' | 'activity' | 'accommodation' | 'transport'
  }))

  const routeSegments = (itinerary.routeSegments || []).map((s) => ({
    ...s,
    from: { ...s.from, type: s.from.type as 'departure' | 'stage' | 'activity' | 'accommodation' | 'transport' },
    to: { ...s.to, type: s.to.type as 'departure' | 'stage' | 'activity' | 'accommodation' | 'transport' }
  }))

  if (mapPoints.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('ai_planning_map_unavailable')}
      </Typography>
    )
  }

  return (
    <>
      <Typography variant="subtitle1" gutterBottom>{t('ai_planning_map_title')}</Typography>
      <TravelMap
      mapPoints={mapPoints}
      routeSegments={routeSegments}
      currency={currency}
      focusMode="trip"
      height={360}
    />
    </>
  )
}

export default TripPlanningMap
