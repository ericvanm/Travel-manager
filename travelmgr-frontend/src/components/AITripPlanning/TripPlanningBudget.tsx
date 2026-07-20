import React from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import { BudgetLineItem } from '../../services/ai-planning'
import { useLanguage } from '../../contexts/LanguageContext'

interface Props {
  items: BudgetLineItem[]
  currency: string
  totalBudget: number
}

const categoryKey = (category: string) => {
  const map: Record<string, string> = {
    transport_outbound: 'ai_planning_budget_outbound',
    transport_return: 'ai_planning_budget_return',
    transport_local: 'ai_planning_budget_local',
    accommodation: 'ai_planning_budget_accommodation',
    activity: 'ai_planning_budget_activity',
    other: 'ai_planning_budget_other'
  }
  return map[category] || 'ai_planning_budget_other'
}

export const TripPlanningBudget: React.FC<Props> = ({ items, currency, totalBudget }) => {
  const { t } = useLanguage()
  const subtotal = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0)

  if (!items.length) return null

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>{t('ai_planning_budget_title')}</Typography>
      <Paper variant="outlined">
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
                <TableCell>{t(categoryKey(item.category))}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.date || '—'}</TableCell>
                <TableCell align="right">{item.estimatedCost} {currency}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3}><strong>{t('ai_planning_budget_subtotal')}</strong></TableCell>
              <TableCell align="right"><strong>{subtotal} {currency}</strong></TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3}>{t('ai_planning_budget_total')}</TableCell>
              <TableCell align="right">{totalBudget} {currency}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

export default TripPlanningBudget
