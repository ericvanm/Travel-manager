import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, IconButton, CircularProgress, Box
} from '@mui/material'
import { Close, Map as MapIcon } from '@mui/icons-material'
import { getTripMapData } from '../../services/trips'
import { MapFocusMode, TripMapData } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import TravelMap from '../shared/TravelMap'

interface Props {
  tripId: number
  open: boolean
  onClose: () => void
}

export const TripMapDialog: React.FC<Props> = ({ tripId, open, onClose }) => {
  const { t } = useLanguage()
  const [mapData, setMapData] = useState<TripMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusMode, setFocusMode] = useState<MapFocusMode>('trip')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getTripMapData(tripId)
      .then(setMapData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tripId, open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MapIcon color="primary" />
        {t('trip_map_title')}
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} aria-label={t('cancel')}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {!loading && mapData && (
          <TravelMap
            mapPoints={mapData.mapPoints}
            routeSegments={mapData.routeSegments}
            currency={mapData.currency}
            focusMode={focusMode}
            onFocusModeChange={setFocusMode}
            showFocusControls
            height={480}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TripMapDialog
