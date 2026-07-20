import React from 'react'
import { Box, Chip, Tooltip } from '@mui/material'
import {
  CheckCircle, Warning, Error as ErrorIcon, AccountBalanceWallet, HelpOutline
} from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'
import { BudgetStatus, TripConsistencySummary, TripHealth } from '../../services/tripConsistency'

interface Props {
  summary?: TripConsistencySummary | null
  compact?: boolean
}

const healthColor = (health: TripHealth): 'success' | 'warning' | 'error' => {
  if (health === 'ok') return 'success'
  if (health === 'warning') return 'warning'
  return 'error'
}

const budgetColor = (status: BudgetStatus): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'ok') return 'success'
  if (status === 'slight_over') return 'warning'
  if (status === 'strong_over') return 'error'
  return 'default'
}

const HealthIcon: React.FC<{ health: TripHealth }> = ({ health }) => {
  if (health === 'ok') return <CheckCircle fontSize="small" />
  if (health === 'warning') return <Warning fontSize="small" />
  return <ErrorIcon fontSize="small" />
}

export const TripConsistencyIndicator: React.FC<Props> = ({ summary, compact = true }) => {
  const { t } = useLanguage()

  if (!summary) {
    return compact ? null : (
      <Chip size="small" icon={<HelpOutline fontSize="small" />} label="—" variant="outlined" />
    )
  }

  const healthLabel = t(`trip_health_${summary.health}`)
  const budgetLabel = t(`trip_budget_status_${summary.budgetStatus}`)
  const issueHint = summary.issueCount > 0
    ? t('trip_consistency_issue_count', { count: summary.issueCount })
    : t('trip_consistency_no_issues')

  return (
    <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
      <Tooltip title={`${healthLabel} — ${issueHint}`}>
        <Chip
          size="small"
          icon={<HealthIcon health={summary.health} />}
          label={compact ? '' : healthLabel}
          color={healthColor(summary.health)}
          variant="outlined"
          sx={compact ? { '& .MuiChip-label': { display: 'none' }, minWidth: 32 } : undefined}
        />
      </Tooltip>
      <Tooltip title={budgetLabel}>
        <Chip
          size="small"
          icon={<AccountBalanceWallet fontSize="small" />}
          label={compact ? '' : budgetLabel}
          color={budgetColor(summary.budgetStatus)}
          variant="outlined"
          sx={compact ? { '& .MuiChip-label': { display: 'none' }, minWidth: 32 } : undefined}
        />
      </Tooltip>
    </Box>
  )
}

export default TripConsistencyIndicator
