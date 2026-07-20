/**
 * AI adaptation dialog for an existing trip (synthesis → proposal → accept).
 *
 * `preloadedSession` skips `startAdaptSession` when TripDetail already obtained a proposal
 * (e.g. consistency auto-fix). Closing without accept calls reject on the server to discard drafts.
 */
import React, { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, Alert, CircularProgress, Chip, List, ListItem, ListItemText, Stepper, Step, StepLabel
} from '@mui/material'
import { AutoAwesome } from '@mui/icons-material'
import { Trip } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  AdaptSession,
  AccommodationWarnings,
  ProposedAdaptation,
  ReservedImpact,
  TripAdaptSynthesis,
  acceptAdaptation,
  proposeAdaptation,
  rejectAdaptation,
  startAdaptSession
} from '../../services/ai-adapt'

interface Props {
  open: boolean
  trip: Trip | null
  onClose: () => void
  onApplied: () => void
  preloadedSession?: {
    sessionId: number
    adaptationRequest: string
    proposedChanges: ProposedAdaptation
    reservedImpacts: ReservedImpact[]
    accommodationWarnings?: AccommodationWarnings
  } | null
  resolveMode?: boolean
}

type Step = 'synthesis' | 'proposal'

const AITripAdapt: React.FC<Props> = ({
  open,
  trip,
  onClose,
  onApplied,
  preloadedSession = null,
  resolveMode = false
}) => {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('synthesis')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [synthesis, setSynthesis] = useState<TripAdaptSynthesis | null>(null)
  const [adaptationRequest, setAdaptationRequest] = useState('')
  const [proposal, setProposal] = useState<ProposedAdaptation | null>(null)
  const [reservedImpacts, setReservedImpacts] = useState<ReservedImpact[]>([])
  const [accommodationWarnings, setAccommodationWarnings] = useState<AccommodationWarnings | null>(null)
  const [appliedWithWarnings, setAppliedWithWarnings] = useState(false)
  const [confirmReserved, setConfirmReserved] = useState(false)

  const reset = () => {
    setStep('synthesis')
    setLoading(false)
    setError(null)
    setSessionId(null)
    setSynthesis(null)
    setAdaptationRequest('')
    setProposal(null)
    setReservedImpacts([])
    setAccommodationWarnings(null)
    setAppliedWithWarnings(false)
    setConfirmReserved(false)
  }

  useEffect(() => {
    if (!open || !trip) return
    reset()

    if (preloadedSession) {
      setSessionId(preloadedSession.sessionId)
      setAdaptationRequest(preloadedSession.adaptationRequest)
      setProposal(preloadedSession.proposedChanges)
      setReservedImpacts(preloadedSession.reservedImpacts || [])
      setAccommodationWarnings(preloadedSession.accommodationWarnings || null)
      setStep('proposal')
      return
    }

    setLoading(true)
    startAdaptSession(trip.id)
      .then((session: AdaptSession) => {
        setSessionId(session.sessionId)
        setSynthesis(session.synthesis)
      })
      .catch(() => setError(t('ai_adapt_error')))
      .finally(() => setLoading(false))
  }, [open, trip?.id, preloadedSession]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (sessionId && !appliedWithWarnings) rejectAdaptation(sessionId).catch(() => {})
    reset()
    onClose()
  }

  const handlePropose = async () => {
    if (!sessionId || !adaptationRequest.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await proposeAdaptation(sessionId, adaptationRequest.trim())
      setProposal(result.proposedChanges)
      setReservedImpacts(result.reservedImpacts || [])
      setAccommodationWarnings(result.accommodationWarnings || null)
      setStep('proposal')
    } catch {
      setError(t('ai_adapt_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!sessionId) return
    if (reservedImpacts.length > 0 && !confirmReserved) {
      setError(t('ai_adapt_confirm_reserved_required'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await acceptAdaptation(sessionId)
      try {
        await onApplied()
      } catch (reloadError) {
        console.error('Failed to refresh trip after adaptation:', reloadError)
      }
      const autoFilled = result.applied?.accommodationAutoFilled ?? 0
      if (autoFilled > 0 && result.accommodationWarnings?.covered) {
        reset()
        onClose()
        return
      }
      if (result.accommodationWarnings && !result.accommodationWarnings.covered) {
        setAccommodationWarnings(result.accommodationWarnings)
        setAppliedWithWarnings(true)
        return
      }
      reset()
      onClose()
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(message || t('ai_adapt_error'))
    } finally {
      setLoading(false)
    }
  }

  const renderAccommodationWarning = (warnings: AccommodationWarnings, afterApply = false) => (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {afterApply ? t('ai_adapt_accommodation_applied_title') : t('ai_adapt_accommodation_warning_title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {afterApply ? t('ai_adapt_accommodation_applied_body') : t('ai_adapt_accommodation_warning_body')}
      </Typography>
      <List dense disablePadding>
        {warnings.uncoveredNights.map((night) => (
          <ListItem key={night} disablePadding sx={{ py: 0 }}>
            <ListItemText
              primary={t('ai_adapt_accommodation_uncovered_night', {
                date: new Date(`${night}T12:00:00`).toLocaleDateString()
              })}
            />
          </ListItem>
        ))}
      </List>
    </Alert>
  )

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome color="secondary" />
        {resolveMode ? t('trip_consistency_resolve_title') : t('ai_adapt_trip_title')}
        {trip ? ` — ${trip.name}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step === 'synthesis' ? 0 : 1} sx={{ mb: 3 }}>
          <Step><StepLabel>{t('ai_adapt_step_synthesis')}</StepLabel></Step>
          <Step><StepLabel>{t('ai_adapt_step_proposal')}</StepLabel></Step>
        </Stepper>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {resolveMode && step === 'proposal' && (
          <Alert severity="info" sx={{ mb: 2 }}>{t('trip_consistency_resolve_hint')}</Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && appliedWithWarnings && accommodationWarnings && (
          <Box>
            {renderAccommodationWarning(accommodationWarnings, true)}
            <Typography variant="body2" color="text.secondary">
              {t('ai_adapt_accommodation_applied_hint')}
            </Typography>
          </Box>
        )}

        {!loading && !appliedWithWarnings && step === 'synthesis' && synthesis && (
          <Box>
            <Typography variant="h6" gutterBottom>{synthesis.title}</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>{synthesis.summary}</Typography>

            {synthesis.stageOverview && synthesis.stageOverview.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{t('stages')}</Typography>
                <List dense>
                  {synthesis.stageOverview.map((line) => (
                    <ListItem key={line} disablePadding><ListItemText primary={line} /></ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {synthesis.highlights.map((h) => (
                <Chip key={h} size="small" label={h} />
              ))}
            </Box>

            {synthesis.warnings.map((w) => (
              <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>
            ))}

            <TextField
              fullWidth
              multiline
              minRows={3}
              label={t('ai_adapt_request_label')}
              placeholder={t('ai_adapt_request_placeholder')}
              value={adaptationRequest}
              onChange={(e) => setAdaptationRequest(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}

        {!loading && !appliedWithWarnings && step === 'proposal' && proposal && (
          <Box>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>{proposal.summary}</Typography>

            {accommodationWarnings && !accommodationWarnings.covered && (
              renderAccommodationWarning(accommodationWarnings)
            )}

            {reservedImpacts.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{t('ai_adapt_reserved_warning_title')}</Typography>
                <List dense>
                  {reservedImpacts.map((impact) => (
                    <ListItem key={impact.entityId} disablePadding>
                      <ListItemText
                        primary={impact.name || `#${impact.entityId}`}
                        secondary={impact.reason || impact.changeDescription}
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="body2" sx={{ mt: 1 }}>{t('ai_adapt_reserved_warning_body')}</Typography>
              </Alert>
            )}

            <Typography variant="subtitle1" gutterBottom>{t('ai_adapt_proposed_changes')}</Typography>
            {proposal.changes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t('ai_adapt_no_changes')}</Typography>
            ) : (
              <List dense>
                {proposal.changes.map((change, idx) => {
                  const actionLabel = change.action === 'update'
                    ? t('edit')
                    : change.action === 'create'
                      ? t('add_activity')
                      : change.action === 'delete'
                        ? t('delete')
                        : change.action
                  return (
                  <ListItem key={`${change.entityType}-${change.entityId}-${idx}`} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch', borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                    <Typography variant="subtitle2">
                      [{actionLabel}] {change.entityType}
                      {change.entityId ? ` #${change.entityId}` : ''}
                      {change.activityType ? ` · ${change.activityType}` : ''}
                    </Typography>
                    {change.location && (
                      <Typography variant="body2">📍 {change.location}</Typography>
                    )}
                    {change.address && (
                      <Typography variant="body2" color="text.secondary">{t('address')}: {change.address}</Typography>
                    )}
                    {change.flightNumber && (
                      <Typography variant="body2" color="text.secondary">{t('flight_number')}: {change.flightNumber}{change.airline ? ` (${change.airline})` : ''}</Typography>
                    )}
                    {(change.departureAirport || change.arrivalAirport) && (
                      <Typography variant="body2" color="text.secondary">
                        {change.departureAirport || '—'} → {change.arrivalAirport || '—'}
                      </Typography>
                    )}
                    {(change.departureLocation || change.arrivalLocation) && !change.departureAirport && (
                      <Typography variant="body2" color="text.secondary">
                        {change.departureLocation || '—'} → {change.arrivalLocation || '—'}
                      </Typography>
                    )}
                    {(change.confirmationCode || change.confirmationNumber) && (
                      <Typography variant="body2" color="text.secondary">
                        {t('confirmation')}: {change.confirmationCode || change.confirmationNumber}
                      </Typography>
                    )}
                    {(change.startDateTime || change.endDateTime) && (
                      <Typography variant="body2" color="text.secondary">
                        {change.startDateTime ? new Date(change.startDateTime).toLocaleString() : '—'}
                        {' → '}
                        {change.endDateTime ? new Date(change.endDateTime).toLocaleString() : '—'}
                      </Typography>
                    )}
                    {change.estimatedCost != null && (
                      <Typography variant="body2">{t('cost')}: {change.estimatedCost}</Typography>
                    )}
                    {change.description && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{change.description}</Typography>
                    )}
                  </ListItem>
                  )
                })}
              </List>
            )}

            {reservedImpacts.length > 0 && (
              <Alert
                severity="warning"
                sx={{ mt: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => setConfirmReserved(true)}>
                    {t('ai_adapt_confirm_reserved')}
                  </Button>
                }
              >
                {confirmReserved ? t('ai_adapt_confirmed_reserved') : t('ai_adapt_confirm_reserved_hint')}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {appliedWithWarnings ? (
          <Button variant="contained" onClick={handleClose}>
            {t('ai_adapt_close')}
          </Button>
        ) : (
          <>
            <Button onClick={handleClose}>{t('cancel')}</Button>
            {step === 'synthesis' && (
              <Button
                variant="contained"
                onClick={handlePropose}
                disabled={loading || !adaptationRequest.trim()}
              >
                {t('ai_adapt_propose')}
              </Button>
            )}
            {step === 'proposal' && (
              <>
                <Button onClick={() => setStep('synthesis')}>{t('ai_adapt_back')}</Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleAccept}
                  disabled={loading || proposal?.changes.length === 0}
                >
                  {t('ai_adapt_apply')}
                </Button>
              </>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default AITripAdapt
