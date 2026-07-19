import React, { useMemo } from 'react'
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button
} from '@mui/material'
import { ReceiptLong } from '@mui/icons-material'
import { Stage, Trip } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  aggregateBudgetByMainCategory,
  buildTripBudgetItems,
  mainCategoryTranslationKey,
  sumBudgetItems,
} from '../../utils/tripBudgetHelpers'

interface Props {
  trip: Trip
  stages: Stage[]
  onViewDetail: () => void
}

const TripBudgetSummary: React.FC<Props> = ({ trip, stages, onViewDetail }) => {
  const { t } = useLanguage()
  const items = useMemo(() => buildTripBudgetItems(stages), [stages])
  const categoryTotals = useMemo(() => aggregateBudgetByMainCategory(items), [items])
  const subtotal = sumBudgetItems(items)
  const currency = trip.currency || 'EUR'
  const planned = trip.budget != null ? Number(trip.budget) : null
  const delta = planned != null ? planned - subtotal : null

  if (categoryTotals.length === 0 && planned == null) return null

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">{t('trip_budget_summary_title')}</Typography>
        {items.length > 0 && (
          <Button size="small" startIcon={<ReceiptLong />} onClick={onViewDetail}>
            {t('trip_budget_view_detail')}
          </Button>
        )}
      </Box>

      {categoryTotals.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('ai_planning_budget_category')}</TableCell>
              <TableCell align="right">{t('cost')}</TableCell>
            </TableRow>
          </TableHead>
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
              <>
                <TableRow>
                  <TableCell>{t('ai_planning_budget_total')}</TableCell>
                  <TableCell align="right">{planned} {currency}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('trip_budget_remaining')}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      color={delta != null && delta < 0 ? 'error' : 'success'}
                      label={`${delta} ${currency}`}
                    />
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('trip_budget_no_costs')}
        </Typography>
      )}
    </Paper>
  )
}

export default TripBudgetSummary
