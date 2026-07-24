import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import {
  Edit, FileDownload, FileUpload, Delete, AutoAwesome, Map as MapIcon
} from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'

interface Props {
  onEdit?: () => void
  onExport?: () => void
  onImportCsv?: () => void
  onAdaptAi?: () => void
  onDelete?: () => void
  onMap?: () => void
  showMap?: boolean
  color?: 'default' | 'inherit'
  aiEnabled?: boolean
}

const TripActionsToolbar: React.FC<Props> = ({
  onEdit,
  onExport,
  onImportCsv,
  onAdaptAi,
  onDelete,
  onMap,
  showMap = false,
  color = 'default',
  aiEnabled = true,
}) => {
  const { t } = useLanguage()
  const iconColor = color === 'inherit' ? 'inherit' : undefined

  return (
    <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
      {onEdit && (
        <Tooltip title={t('edit')}>
          <IconButton size="small" color={iconColor} aria-label={t('edit')} onClick={onEdit}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onExport && (
        <Tooltip title={t('export_csv')}>
          <IconButton size="small" color={iconColor} aria-label={t('export_csv')} onClick={onExport}>
            <FileDownload fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onImportCsv && (
        <Tooltip title={t('import_csv')}>
          <IconButton size="small" color={iconColor} aria-label={t('import_csv')} onClick={onImportCsv}>
            <FileUpload fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onAdaptAi && (
        <Tooltip title={!aiEnabled ? t('ai_features_disabled') : t('ai_adapt_trip_title')}>
          <span>
            <IconButton
              size="small"
              color={color === 'inherit' ? 'inherit' : 'secondary'}
              aria-label={t('ai_adapt_trip_title')}
              onClick={aiEnabled ? onAdaptAi : undefined}
              disabled={!aiEnabled}
            >
              <AutoAwesome fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {showMap && onMap && (
        <Tooltip title={t('trip_map_title')}>
          <IconButton size="small" color={color === 'inherit' ? 'inherit' : 'primary'} aria-label={t('trip_map_title')} onClick={onMap}>
            <MapIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip title={t('delete')}>
          <IconButton size="small" color={color === 'inherit' ? 'inherit' : 'error'} aria-label={t('delete')} onClick={onDelete}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

export default TripActionsToolbar
