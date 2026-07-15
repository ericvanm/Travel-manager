import React, { useEffect, useMemo } from 'react'
import { Box, Typography, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapFocusMode, TripMapPoint, TripMapRouteSegment } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const ROUTE_COLORS: Record<string, string> = {
  flight: '#1976d2',
  train: '#2e7d32',
  car: '#ed6c02',
  bus: '#9c27b0',
  default: '#757575'
}

interface Props {
  mapPoints: TripMapPoint[]
  routeSegments: TripMapRouteSegment[]
  currency?: string
  focusMode: MapFocusMode
  onFocusModeChange?: (mode: MapFocusMode) => void
  showFocusControls?: boolean
  height?: number
}

const MapBoundsController: React.FC<{
  points: TripMapPoint[]
  focusMode: MapFocusMode
}> = ({ points, focusMode }) => {
  const map = useMap()

  useEffect(() => {
    const valid = points.filter((p) => p.lat && p.lng)
    if (valid.length === 0) return

    if (focusMode === 'global' && valid.length >= 2) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds.pad(0.35))
      return
    }

    const stagePoints = valid.filter((p) => ['stage', 'activity', 'accommodation', 'transport'].includes(p.type))
    const target = stagePoints.length > 0 ? stagePoints : valid
    const bounds = L.latLngBounds(target.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds.pad(0.15))
  }, [map, points, focusMode])

  return null
}

export const TravelMap: React.FC<Props> = ({
  mapPoints,
  routeSegments,
  currency = 'EUR',
  focusMode,
  onFocusModeChange,
  showFocusControls = false,
  height = 360
}) => {
  const { t } = useLanguage()

  const { center, dedupedPoints } = useMemo(() => {
    const fromRoutes = routeSegments.flatMap((s) => [s.from, s.to])
    const all = [...mapPoints, ...fromRoutes].filter((p) => p?.lat && p?.lng)

    if (all.length === 0) {
      return { center: [46.5, 2.5] as [number, number], dedupedPoints: mapPoints }
    }

    const lat = all.reduce((sum, p) => sum + p.lat, 0) / all.length
    const lng = all.reduce((sum, p) => sum + p.lng, 0) / all.length

    const seen = new Set<string>()
    const deduped = mapPoints.filter((p) => {
      const key = `${p.lat.toFixed(3)}:${p.lng.toFixed(3)}:${p.type}:${p.label}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { center: [lat, lng] as [number, number], dedupedPoints: deduped }
  }, [mapPoints, routeSegments])

  if (mapPoints.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('trip_map_unavailable')}
      </Typography>
    )
  }

  return (
    <Box sx={{ mb: 2 }}>
      {showFocusControls && onFocusModeChange && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={focusMode}
            onChange={(_, value) => value && onFocusModeChange(value)}
          >
            <ToggleButton value="trip">{t('trip_map_focus_trip')}</ToggleButton>
            <ToggleButton value="global">{t('trip_map_focus_global')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <Box sx={{ height, width: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBoundsController points={[...mapPoints, ...routeSegments.flatMap((s) => [s.from, s.to])]} focusMode={focusMode} />

          {routeSegments.map((segment, idx) => (
            <Polyline
              key={`${segment.label}-${idx}`}
              positions={[
                [segment.from.lat, segment.from.lng],
                [segment.to.lat, segment.to.lng]
              ]}
              pathOptions={{
                color: ROUTE_COLORS[segment.transportMode || 'default'] || ROUTE_COLORS.default,
                weight: 4,
                opacity: 0.8,
                dashArray: segment.transportMode === 'flight' ? '8 8' : undefined
              }}
            />
          ))}

          {dedupedPoints.map((point) => {
            const reservationLabel = point.reservationStatus === 'reserved'
              ? t('reservation_reserved')
              : point.reservationStatus === 'to_reserve'
                ? t('reservation_to_book')
                : null

            if (point.type === 'activity') {
              return (
                <CircleMarker
                  key={`${point.type}-${point.label}-${point.lat}`}
                  center={[point.lat, point.lng]}
                  radius={7}
                  pathOptions={{ color: '#ff9800', fillColor: '#ffb74d', fillOpacity: 0.9 }}
                >
                  <Popup>
                    <strong>{point.label}</strong>
                    {point.estimatedCost != null && <div>{point.estimatedCost} {currency}</div>}
                    {reservationLabel && <div>{reservationLabel}</div>}
                  </Popup>
                </CircleMarker>
              )
            }

            return (
              <Marker key={`${point.type}-${point.label}-${point.lat}`} position={[point.lat, point.lng]}>
                <Popup>
                  <strong>{point.label}</strong>
                  <div>{t(`ai_planning_map_${point.type === 'transport' ? 'activity' : point.type}`)}</div>
                  {point.transportMode && <Chip size="small" label={point.transportMode} sx={{ mt: 0.5 }} />}
                  {point.estimatedCost != null && <div>{point.estimatedCost} {currency}</div>}
                  {reservationLabel && <div>{reservationLabel}</div>}
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </Box>

      {routeSegments.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {routeSegments.map((segment, idx) => (
            <Chip
              key={`${segment.label}-${idx}`}
              size="small"
              label={`${segment.label}${segment.estimatedCost != null ? ` — ${segment.estimatedCost} ${currency}` : ''}`}
              sx={{ borderLeft: `4px solid ${ROUTE_COLORS[segment.transportMode || 'default'] || ROUTE_COLORS.default}` }}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

export default TravelMap
