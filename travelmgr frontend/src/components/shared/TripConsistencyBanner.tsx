import React, { useState } from 'react'
import {
  Alert, Box, Button, Collapse, List, ListItem, ListItemText, Typography, CircularProgress
} from '@mui/material'
import { AutoFixHigh, ExpandLess, ExpandMore } from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  ConsistencyIssue,
  TripConsistencyReport
} from '../../services/tripConsistency'
import TripConsistencyIndicator from './TripConsistencyIndicator'

interface Props {
  report: TripConsistencyReport | null
  loading?: boolean
  onResolve: () => void
  resolving?: boolean
}

const issueTranslationKey = (code: string) => `consistency_${code}`

const formatIssue = (
  issue: ConsistencyIssue,
  t: (key: string, params?: Record<string, string | number>) => string
) => {
  const params: Record<string, string | number> = {}
  if (issue.params) {
    for (const [key, value] of Object.entries(issue.params)) {
      params[key] = value
    }
  }
  const key = issueTranslationKey(issue.code)
  const translated = t(key, params)
  return translated !== key ? translated : `${issue.code}${issue.params ? ` (${JSON.stringify(issue.params)})` : ''}`
}

export const TripConsistencyBanner: React.FC<Props> = ({
  report,
  loading,
  onResolve,
  resolving
}) => {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(true)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">{t('trip_consistency_loading')}</Typography>
      </Box>
    )
  }

  if (!report) return null

  const canResolve = report.errorCount > 0 || report.warningCount > 0
  const severity = report.health === 'ok' ? 'success' : report.health === 'warning' ? 'warning' : 'error'

  const summaryForIndicator = {
    tripId: report.tripId,
    health: report.health,
    budgetStatus: report.budget.status,
    issueCount: report.issueCount,
    errorCount: report.errorCount,
    warningCount: report.warningCount
  }

  return (
    <Alert
      severity={severity}
      sx={{ mb: 3 }}
      action={
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <TripConsistencyIndicator summary={summaryForIndicator} compact={false} />
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={resolving ? <CircularProgress size={16} color="inherit" /> : <AutoFixHigh />}
            disabled={!canResolve || resolving}
            onClick={onResolve}
          >
            {t('trip_consistency_resolve')}
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        <Typography variant="subtitle1">{t('trip_consistency_title')}</Typography>
        {report.issues.length > 0 && (
          <Button size="small" endIcon={expanded ? <ExpandLess /> : <ExpandMore />} onClick={() => setExpanded(!expanded)}>
            {t('trip_consistency_details')}
          </Button>
        )}
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {report.health === 'ok'
          ? t('trip_consistency_ok_message')
          : t('trip_consistency_issues_message', { errors: report.errorCount, warnings: report.warningCount })}
      </Typography>
      {report.budget.planned != null && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {t('trip_consistency_budget_line', {
            actual: report.budget.actual,
            planned: report.budget.planned,
            currency: report.budget.currency
          })}
          {report.budget.overrunPercent != null && report.budget.overrunPercent > 0
            ? ` (+${report.budget.overrunPercent}%)`
            : ''}
        </Typography>
      )}
      <Collapse in={expanded && report.issues.length > 0}>
        <List dense disablePadding sx={{ mt: 1 }}>
          {report.issues.map((issue, idx) => (
            <ListItem key={`${issue.code}-${idx}`} disablePadding sx={{ py: 0.25 }}>
              <ListItemText
                primary={formatIssue(issue, t)}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: issue.severity === 'error' ? 'error.main' : issue.severity === 'warning' ? 'warning.dark' : 'text.secondary'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Alert>
  )
}

export default TripConsistencyBanner
