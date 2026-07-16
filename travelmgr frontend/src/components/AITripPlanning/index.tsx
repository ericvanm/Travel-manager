import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  MenuItem,
  Grid
} from '@mui/material'
import { AutoAwesome, History } from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { Trip } from '../../types'
import {
  TripPlanningFormData,
  TripPlanningSession,
  PlanningSynthesis,
  PlannedItinerary,
  defaultFormData,
  savePlanningSession,
  validatePlanningSession,
  confirmPlanningSynthesis,
  revisePlanningItinerary,
  acceptPlanningItinerary,
  rejectPlanningItinerary,
  getPlanningSessions,
  getInspirationSites
} from '../../services/ai-planning'
import TripPlanningMap from './TripPlanningMap'
import TripPlanningBudget from './TripPlanningBudget'

interface Props {
  open: boolean
  onClose: () => void
  onTripCreated: (trip: Trip) => void
}

type WizardStep = 'form' | 'synthesis' | 'itinerary'

const STEPS: WizardStep[] = ['form', 'synthesis', 'itinerary']

const renderMarkdownish = (text: string) =>
  text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return <Typography key={i} variant="h5" sx={{ mt: 2, mb: 1 }}>{line.slice(2)}</Typography>
    }
    if (line.startsWith('## ')) {
      return <Typography key={i} variant="h6" sx={{ mt: 2, mb: 1 }}>{line.slice(3)}</Typography>
    }
    if (line.startsWith('**') && line.includes('**')) {
      const parts = line.split('**')
      return (
        <Typography key={i} variant="body1" sx={{ mb: 0.5 }}>
          {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
        </Typography>
      )
    }
    if (line.startsWith('- ')) {
      return <Typography key={i} variant="body2" sx={{ ml: 2, mb: 0.5 }}>• {line.slice(2)}</Typography>
    }
    if (line.trim() === '') return <Box key={i} sx={{ height: 8 }} />
    return <Typography key={i} variant="body1" sx={{ mb: 0.5 }}>{line}</Typography>
  })

export const AITripPlanning: React.FC<Props> = ({ open, onClose, onTripCreated }) => {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [step, setStep] = useState<WizardStep>('form')
  const [formData, setFormData] = useState<TripPlanningFormData>(defaultFormData())
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [synthesis, setSynthesis] = useState<PlanningSynthesis | null>(null)
  const [itinerary, setItinerary] = useState<PlannedItinerary | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [showRevisionInput, setShowRevisionInput] = useState(false)
  const [history, setHistory] = useState<TripPlanningSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [availableInspirationSites, setAvailableInspirationSites] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      loadHistory()
      getInspirationSites()
        .then((data) => setAvailableInspirationSites(data.sites.map((s) => s.name)))
        .catch(() => setAvailableInspirationSites(['GetYourGuide', 'Viator', 'TripAdvisor']))
      if (user?.defaultDepartureLocation) {
        setFormData((prev) => ({
          ...prev,
          departureLocation: user.defaultDepartureLocation || prev.departureLocation
        }))
      }
    }
  }, [open, user?.defaultDepartureLocation])

  const loadHistory = async () => {
    try {
      const sessions = await getPlanningSessions()
      setHistory(sessions.filter((s) => s.status !== 'accepted'))
    } catch {
      setHistory([])
    }
  }

  const resetWizard = () => {
    setStep('form')
    setFormData(defaultFormData())
    setSessionId(null)
    setSynthesis(null)
    setItinerary(null)
    setErrors([])
    setWarnings([])
    setRevisionText('')
    setShowRevisionInput(false)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const updateField = (field: keyof TripPlanningFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resumeSession = (session: TripPlanningSession) => {
    setFormData({ ...defaultFormData(), ...session.formData })
    setSessionId(session.id)
    setSynthesis(session.synthesis || null)
    setItinerary(session.itinerary || null)
    setWarnings(session.synthesis?.warnings || [])
    setErrors([])

    if (session.itinerary) {
      setStep('itinerary')
    } else if (session.synthesis) {
      setStep('synthesis')
    } else {
      setStep('form')
    }
    setShowHistory(false)
  }

  const handleValidateForm = async () => {
    setLoading(true)
    setErrors([])
    setWarnings([])
    try {
      const session = await savePlanningSession(formData, sessionId ?? undefined)
      setSessionId(session.id)

      try {
        const result = await validatePlanningSession(session.id, formData)
        setWarnings(result.validation.warnings)
        if (result.synthesis) {
          setSynthesis(result.synthesis)
          setStep('synthesis')
        }
      } catch (err: unknown) {
        const error = err as Error & { data?: { validation?: { errors?: string[]; warnings?: string[] } } }
        const validation = error.data?.validation
        if (validation) {
          setErrors(validation.errors || [])
          setWarnings(validation.warnings || [])
        } else {
          setErrors([error.message])
        }
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : t('ai_planning_error')])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSynthesis = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await confirmPlanningSynthesis(sessionId)
      setItinerary(result.itinerary)
      setStep('itinerary')
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : t('ai_planning_error')])
    } finally {
      setLoading(false)
    }
  }

  const handleRevise = async () => {
    if (!sessionId || !revisionText.trim()) return
    setLoading(true)
    try {
      const result = await revisePlanningItinerary(sessionId, revisionText.trim())
      setItinerary(result.itinerary)
      setRevisionText('')
      setShowRevisionInput(false)
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : t('ai_planning_error')])
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await acceptPlanningItinerary(sessionId)
      onTripCreated(result.trip as Trip)
      handleClose()
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : t('ai_planning_error')])
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!sessionId) {
      setStep('form')
      return
    }
    setLoading(true)
    try {
      const result = await rejectPlanningItinerary(sessionId)
      setFormData({ ...defaultFormData(), ...result.formData })
      setSynthesis(null)
      setItinerary(null)
      setStep('form')
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : t('ai_planning_error')])
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome color="primary" />
        {t('ai_planning_title')}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<History />}
          onClick={() => setShowHistory(!showHistory)}
        >
          {t('ai_planning_history')}
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={stepIndex} sx={{ mb: 3 }}>
          <Step><StepLabel>{t('ai_planning_step_form')}</StepLabel></Step>
          <Step><StepLabel>{t('ai_planning_step_synthesis')}</StepLabel></Step>
          <Step><StepLabel>{t('ai_planning_step_itinerary')}</StepLabel></Step>
        </Stepper>

        {errors.map((err) => (
          <Alert key={err} severity="error" sx={{ mb: 1 }}>{err}</Alert>
        ))}
        {warnings.map((warn) => (
          <Alert key={warn} severity="warning" sx={{ mb: 1 }}>{warn}</Alert>
        ))}

        {showHistory && history.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>{t('ai_planning_resume')}</Typography>
            <List dense>
              {history.map((session) => (
                <ListItem key={session.id} disablePadding>
                  <ListItemButton onClick={() => resumeSession(session)}>
                    <ListItemText
                      primary={session.formData.geographicZone || t('ai_planning_untitled')}
                      secondary={`${session.formData.durationDays}j — ${session.status} — ${session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : ''}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </Box>
        )}

        {step === 'form' && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('ai_planning_departure')}
                value={formData.departureLocation}
                onChange={(e) => updateField('departureLocation', e.target.value)}
                placeholder={t('ai_planning_departure_placeholder')}
                helperText={t('ai_planning_departure_help')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('ai_planning_zone')}
                value={formData.geographicZone}
                onChange={(e) => updateField('geographicZone', e.target.value)}
                placeholder={t('ai_planning_zone_placeholder')}
                helperText={t('ai_planning_zone_help')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                label={t('ai_planning_duration')}
                value={formData.durationDays}
                onChange={(e) => updateField('durationDays', parseInt(e.target.value, 10) || 0)}
                inputProps={{ min: 1, max: 90 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label={t('ai_planning_start_date')}
                value={formData.startDate || ''}
                onChange={(e) => updateField('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText={t('ai_planning_start_date_help')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label={t('ai_planning_currency')}
                value={formData.currency}
                onChange={(e) => updateField('currency', e.target.value)}
              >
                {['EUR', 'USD', 'GBP', 'CHF', 'CAD'].map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label={t('ai_planning_style')}
                value={formData.travelStyle}
                onChange={(e) => updateField('travelStyle', e.target.value)}
                placeholder={t('ai_planning_style_placeholder')}
                helperText={t('ai_planning_style_help')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('ai_planning_transport')}
                value={formData.localTransport}
                onChange={(e) => updateField('localTransport', e.target.value)}
                placeholder={t('ai_planning_transport_placeholder')}
                helperText={t('ai_planning_transport_help')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('ai_planning_accommodation')}
                value={formData.accommodationType}
                onChange={(e) => updateField('accommodationType', e.target.value)}
                placeholder={t('ai_planning_accommodation_placeholder')}
                helperText={t('ai_planning_accommodation_help')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label={t('ai_planning_budget')}
                value={formData.budget}
                onChange={(e) => updateField('budget', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                required
                type="number"
                label={t('ai_planning_activity_hours_min')}
                value={formData.minActivityHoursPerDay}
                onChange={(e) => updateField('minActivityHoursPerDay', Math.max(0, parseFloat(e.target.value) || 0))}
                inputProps={{ min: 0, max: 16, step: 0.5 }}
                helperText={t('ai_planning_activity_hours_help')}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                required
                type="number"
                label={t('ai_planning_activity_hours_max')}
                value={formData.maxActivityHoursPerDay}
                onChange={(e) => updateField('maxActivityHoursPerDay', Math.max(0, parseFloat(e.target.value) || 0))}
                inputProps={{ min: 0, max: 16, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('ai_planning_inspiration_sites')}
                value={formData.activityInspirationSites}
                onChange={(e) => updateField('activityInspirationSites', e.target.value)}
                placeholder={t('ai_planning_inspiration_sites_placeholder')}
                helperText={
                  availableInspirationSites.length > 0
                    ? `${t('ai_planning_inspiration_sites_help')}: ${availableInspirationSites.join(', ')}`
                    : t('ai_planning_inspiration_sites_help')
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={6}
                label={t('ai_planning_remarks')}
                value={formData.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                placeholder={t('ai_planning_remarks_placeholder')}
                helperText={t('ai_planning_remarks_help')}
              />
            </Grid>
          </Grid>
        )}

        {step === 'synthesis' && synthesis && (
          <Box>
            <Typography variant="h6" gutterBottom>{synthesis.title}</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {synthesis.summary}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {synthesis.highlights.map((h, idx) => (
                <Chip key={`highlight-${idx}`} label={h} color="primary" variant="outlined" />
              ))}
            </Box>
            {synthesis.recommendedOutboundTransport && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('ai_planning_recommended_transport')}: {synthesis.recommendedOutboundTransport.label}
                {' '}({synthesis.recommendedOutboundTransport.estimatedCost} {formData.currency})
              </Alert>
            )}
            {synthesis.outboundTransportOptions && synthesis.outboundTransportOptions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{t('ai_planning_transport_options')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {synthesis.outboundTransportOptions.map((opt, idx) => (
                    <Chip
                      key={`${opt.mode}-${idx}-${opt.label}`}
                      label={`${opt.label} — ${opt.estimatedCost} ${formData.currency}`}
                      variant={opt.mode === synthesis.recommendedOutboundTransport?.mode ? 'filled' : 'outlined'}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('ai_planning_daily_budget')}: {synthesis.estimatedDailyBudget} {formData.currency}
            </Typography>
            {synthesis.source && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('ai_planning_source')}: {synthesis.source}
              </Typography>
            )}
          </Box>
        )}

        {step === 'itinerary' && itinerary && (
          <Box>
            <Typography variant="h6" gutterBottom>{itinerary.title}</Typography>
            {itinerary.activityHoursFilledDays && itinerary.activityHoursFilledDays.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('ai_planning_activity_hours_filled', { days: itinerary.activityHoursFilledDays.length })}
              </Alert>
            )}
            {itinerary.activityHoursWarnings?.map((warning, idx) => (
              <Alert key={`hours-warn-${idx}`} severity="warning" sx={{ mb: 1 }}>
                {warning}
              </Alert>
            ))}
            <Alert severity="info" sx={{ mb: 2 }}>{itinerary.transportRoute}</Alert>

            <TripPlanningMap itinerary={itinerary} currency={formData.currency} />

            <TripPlanningBudget
              items={itinerary.budgetBreakdown || []}
              currency={formData.currency}
              totalBudget={itinerary.trip.budget}
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              {itinerary.images?.map((img) => (
                <Grid item xs={12} sm={4} key={img.url}>
                  <Card>
                    <CardMedia component="img" height="140" image={img.url} alt={img.caption} />
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="caption">{img.caption}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
              {renderMarkdownish(itinerary.textItinerary)}
            </Box>

            {showRevisionInput && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('ai_planning_revision_label')}
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder={t('ai_planning_revision_placeholder')}
                sx={{ mb: 2 }}
              />
            )}
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>{t('ai_planning_loading')}</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>{t('cancel')}</Button>

        {step === 'form' && (
          <Button variant="contained" onClick={handleValidateForm} disabled={loading}>
            {t('ai_planning_validate')}
          </Button>
        )}

        {step === 'synthesis' && (
          <>
            <Button onClick={() => setStep('form')} disabled={loading}>
              {t('ai_planning_back_form')}
            </Button>
            <Button variant="contained" onClick={handleConfirmSynthesis} disabled={loading}>
              {t('ai_planning_confirm_synthesis')}
            </Button>
          </>
        )}

        {step === 'itinerary' && (
          <>
            <Button color="error" onClick={handleReject} disabled={loading}>
              {t('ai_planning_reject')}
            </Button>
            {!showRevisionInput ? (
              <Button onClick={() => setShowRevisionInput(true)} disabled={loading}>
                {t('ai_planning_revise')}
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={handleRevise}
                disabled={loading || !revisionText.trim()}
              >
                {t('ai_planning_send_revision')}
              </Button>
            )}
            <Button variant="contained" color="success" onClick={handleAccept} disabled={loading}>
              {t('ai_planning_accept')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default AITripPlanning
