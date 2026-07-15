import React, { useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Typography, Box
} from '@mui/material'
import { Close, ReceiptLong } from '@mui/icons-material'
import { Stage, Trip } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  aggregateBudgetByMainCategory,
  buildTripBudgetItems,
  detailCategoryTranslationKey,
  mainCategoryTranslationKey,
  sumBudgetItems,
} from '../../utils/tripBudgetHelpers'

interface Props {
  open: boolean
  onClose: () => void
  trip: Trip
  stages: Stage[]
}

const TripBudgetDetailDialog: React.FC<Props> = ({ open, onClose, trip, stages }) => {
  const { t } = useLanguage()
  const items = useMemo(() => buildTripBudgetItems(stages), [stages])
  const categoryTotals = useMemo(() => aggregateBudgetByMainCategory(items), [items])
  const subtotal = sumBudgetItems(items)
  const currency = trip.currency || 'EUR'
  const planned = trip.budget != null ? Number(trip.budget) : null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptLong color="primary" />
        {t('trip_budget_detail_title')}
        <IconButton onClick={onClose} sx={{ ml: 'auto' }} aria-label={t('cancel')}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>{t('trip_budget_summary_title')}</Typography>
        <Paper variant="outlined" sx={{ mb: 3, p: 1 }}>
          <Table size="small">
            <TableBody>
              {categoryTotals.map((entry) => (
                <TableRow key={entry.category}>
                  <TableCell>{t(mainCategoryTranslationKey(entry.category))}</TableCell>
                  <TableCell align="right">{entry.total} {currency}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell><strong>{t('trip_budget_actual_total')}</strong></TableCell>
                <TableCell align="right"><strong>{subtotal} {currency}</strong></TableCell>
              </TableRow>
              {planned != null && (
                <TableRow>
                  <TableCell>{t('ai_planning_budget_total')}</TableCell>
                  <TableCell align="right">{planned} {currency}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Typography variant="subtitle1" gutterBottom>{t('trip_budget_detail_lines')}</Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('trip_budget_no_costs')}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('ai_planning_budget_category')}</TableCell>
                <TableCell>{t('ai_planning_budget_item')}</TableCell>
                <TableCell>{t('start_date')}</TableCell>
                <TableCell align="right">{t('cost')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.category}-${item.name}-${item.date || ''}`}>
                  <TableCell>{t(detailCategoryTranslationKey(item.category))}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.date || '—'}</TableCell>
                  <TableCell align="right">{item.estimatedCost} {currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>{t('cancel')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default TripBudgetDetailDialog
