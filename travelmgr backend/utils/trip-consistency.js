/**
 * Trip consistency validation rules.
 * @see documents/trip-consistency-rules.md
 */

const { flattenActivities } = require('./trip-flatten')
const {
  validateTripAccommodationCoverage
} = require('./trip-accommodation-validation')
const { parseDateOnly, addDays, deriveTripDateBounds } = require('./date-only')
const {
  extractStageCity,
  locationsCompatible,
  getHotelLocation,
  getActivityLocation,
  getTransportArrival,
  getTransportDeparture,
  isTransportActivity: isTransportForLocation,
  isTransportStageCoherent,
  isReturnHomeTransport
} = require('./trip-location-validation')

const parseTime = (value) => {
  if (!value) return 0
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? 0 : d.getTime()
}

const isTransportActivity = (activity) =>
  isTransportForLocation(activity)

const extractStageLabel = (stage) => extractStageCity(stage) || `Stage ${stage?.id}`

const stagesOverlapLocation = (a, b) => {
  const la = extractStageLabel(a).toLowerCase()
  const lb = extractStageLabel(b).toLowerCase()
  if (!la || !lb) return true
  return la === lb || la.includes(lb) || lb.includes(la)
}

const computeBudgetStatus = (trip, activities) => {
  const actual = activities.reduce((sum, a) => sum + (Number(a.cost) || 0), 0)
  const planned = trip?.budget != null ? Number(trip.budget) : null
  const currency = trip?.currency || 'EUR'

  if (planned == null || planned <= 0) {
    return {
      status: 'none',
      planned: null,
      actual,
      currency,
      delta: null,
      overrunPercent: null
    }
  }

  const delta = planned - actual
  const overrunPercent = actual > planned ? ((actual - planned) / planned) * 100 : 0

  let status = 'ok'
  if (actual > planned) {
    status = overrunPercent <= 15 ? 'slight_over' : 'strong_over'
  }

  return {
    status,
    planned,
    actual,
    currency,
    delta,
    overrunPercent: actual > planned ? Math.round(overrunPercent * 10) / 10 : 0
  }
}

const findTransportBetweenStages = (fromStage, toStage, activities) => {
  const windowStart = parseTime(fromStage.endDate || fromStage.startDate)
  const windowEnd = parseTime(toStage.startDate) + 86400000

  return activities.filter(isTransportActivity).some((act) => {
    if (act.stageId !== fromStage.id && act.stageId !== toStage.id) return false
    const actTime = parseTime(act.startDateTime || act.endDateTime || act.checkInDate)
    if (!actTime) return true
    if (!windowStart && !windowEnd) return true
    return actTime >= windowStart - 86400000 * 2 && actTime <= windowEnd + 86400000 * 2
  })
}

const buildIssue = (code, severity, params = {}) => ({ code, severity, params })

const validateTripConsistency = (snapshot) => {
  const trip = snapshot?.trip || {}
  const stages = [...(snapshot?.stages || [])].sort((a, b) =>
    parseTime(a.startDate) - parseTime(b.startDate)
  )
  const activities = flattenActivities(snapshot || { stages: [] })
  const issues = []

  const accommodation = validateTripAccommodationCoverage(snapshot)

  for (const invalid of accommodation.invalidAccommodations || []) {
    issues.push(buildIssue('ACCOMMODATION_MISSING_DATES', 'error', {
      name: invalid.name || `#${invalid.id}`
    }))
  }

  for (const night of accommodation.uncoveredNights) {
    issues.push(buildIssue('ACCOMMODATION_NIGHT_UNCOVERED', 'error', { date: night }))
  }

  const { start: effectiveStart, end: effectiveEnd } = deriveTripDateBounds(trip, stages, activities)
  if (!effectiveStart || !effectiveEnd) {
    issues.push(buildIssue('TRIP_DATES_MISSING', 'warning'))
  } else if (trip.startDate && trip.endDate) {
    const tripStart = parseDateOnly(trip.startDate)
    const tripEnd = parseDateOnly(trip.endDate)
    for (const stage of stages) {
      const ss = parseDateOnly(stage.startDate)
      const se = parseDateOnly(stage.endDate)
      if (ss && ss < tripStart) {
        issues.push(buildIssue('STAGE_BEFORE_TRIP_START', 'warning', { stage: extractStageLabel(stage), date: ss }))
      }
      if (se && se > tripEnd) {
        issues.push(buildIssue('STAGE_AFTER_TRIP_END', 'warning', { stage: extractStageLabel(stage), date: se }))
      }
    }
  }

  for (let i = 1; i < stages.length; i += 1) {
    const fromStage = stages[i - 1]
    const toStage = stages[i]
    if (stagesOverlapLocation(fromStage, toStage)) continue
    if (!findTransportBetweenStages(fromStage, toStage, activities)) {
      issues.push(buildIssue('TRANSPORT_MISSING_BETWEEN_STAGES', 'error', {
        from: extractStageLabel(fromStage),
        to: extractStageLabel(toStage)
      }))
    }
  }

  if (trip.departureLocation && stages.length > 0) {
    const firstStage = stages[0]
    const outbound = activities.filter(isTransportActivity).some((act) => {
      const dep = (act.departureLocation || act.departureAirport || '').toLowerCase()
      return dep.includes(String(trip.departureLocation).split(',')[0].trim().toLowerCase().slice(0, 6))
        || act.stageId === firstStage.id
    })
    if (!outbound) {
      issues.push(buildIssue('TRANSPORT_MISSING_OUTBOUND', 'warning', {
        departure: trip.departureLocation,
        destination: extractStageLabel(firstStage)
      }))
    }

    const lastStage = stages[stages.length - 1]
    const returnTrip = activities.filter(isTransportActivity).some((act) => {
      const arr = (act.arrivalLocation || act.arrivalAirport || act.departureLocation || '').toLowerCase()
      const home = String(trip.departureLocation).split(',')[0].trim().toLowerCase()
      return arr.includes(home.slice(0, 6)) || act.stageId === lastStage.id
    })
    if (!returnTrip && stages.length > 0) {
      issues.push(buildIssue('TRANSPORT_MISSING_RETURN', 'warning', {
        from: extractStageLabel(lastStage),
        departure: trip.departureLocation
      }))
    }
  }

  for (const stage of stages) {
    const stageCity = extractStageLabel(stage)
    const stageActivities = stage.activities || []

    for (const activity of stageActivities) {
      if (activity.activityTypeId === 7) {
        const hotelLoc = getHotelLocation(activity)
        if (!hotelLoc) {
          issues.push(buildIssue('ACCOMMODATION_MISSING_LOCATION', 'error', {
            name: activity.name || `#${activity.id}`,
            stage: stageCity
          }))
        } else if (stageCity && !locationsCompatible(hotelLoc, stageCity)) {
          issues.push(buildIssue('ACCOMMODATION_LOCATION_MISMATCH', 'error', {
            name: activity.name || `#${activity.id}`,
            location: hotelLoc,
            stage: stageCity
          }))
        }
        continue
      }

      if (isTransportActivity(activity)) {
        const arrival = getTransportArrival(activity)
        const departure = getTransportDeparture(activity)
        if (!arrival && !departure) {
          issues.push(buildIssue('TRANSPORT_MISSING_LOCATION', 'warning', {
            name: activity.name || `#${activity.id}`,
            stage: stageCity
          }))
        } else if (!isTransportStageCoherent(activity, stage, stages, trip)) {
          issues.push(buildIssue('TRANSPORT_LOCATION_MISMATCH', 'error', {
            name: activity.name || `#${activity.id}`,
            departure: departure || '—',
            arrival: arrival || '—',
            stage: stageCity
          }))
        }
        continue
      }

      const actLoc = getActivityLocation(activity)
      if (!actLoc) {
        issues.push(buildIssue('ACTIVITY_MISSING_LOCATION', 'warning', {
          name: activity.name || `#${activity.id}`,
          stage: stageCity
        }))
      } else if (stageCity && !locationsCompatible(actLoc, stageCity)) {
        issues.push(buildIssue('ACTIVITY_LOCATION_MISMATCH', 'error', {
          name: activity.name || `#${activity.id}`,
          location: actLoc,
          stage: stageCity
        }))
      }
    }

    if (!stageActivities.length) {
      issues.push(buildIssue('STAGE_NO_ACTIVITIES', 'info', { stage: stageCity }))
    }
  }

  const datedActivities = activities.filter((a) =>
    !isTransportActivity(a) && a.activityTypeId !== 7
  )
  for (const act of datedActivities) {
    if (!act.startDateTime && !act.endDateTime) {
      issues.push(buildIssue('ACTIVITY_MISSING_DATES', 'info', { name: act.name || `#${act.id}` }))
    }
  }

  for (let i = 1; i < stages.length; i += 1) {
    const prevEnd = parseDateOnly(stages[i - 1].endDate)
    const nextStart = parseDateOnly(stages[i].startDate)
    if (prevEnd && nextStart) {
      const gapStart = addDays(prevEnd, 1)
      if (gapStart && gapStart < nextStart) {
        issues.push(buildIssue('STAGE_DATE_GAP', 'warning', {
          from: extractStageLabel(stages[i - 1]),
          to: extractStageLabel(stages[i]),
          gapStart,
          gapEnd: nextStart
        }))
      }
    }
  }

  const budget = computeBudgetStatus(trip, activities)
  if (budget.status === 'slight_over') {
    issues.push(buildIssue('BUDGET_SLIGHT_OVERRUN', 'warning', {
      planned: budget.planned,
      actual: budget.actual,
      currency: budget.currency,
      percent: budget.overrunPercent
    }))
  } else if (budget.status === 'strong_over') {
    issues.push(buildIssue('BUDGET_STRONG_OVERRUN', 'error', {
      planned: budget.planned,
      actual: budget.actual,
      currency: budget.currency,
      percent: budget.overrunPercent
    }))
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length

  let health = 'ok'
  if (errorCount > 0 || budget.status === 'strong_over') health = 'error'
  else if (warningCount > 0 || budget.status === 'slight_over') health = 'warning'

  return {
    tripId: trip.id,
    health,
    issueCount: issues.length,
    errorCount,
    warningCount,
    issues,
    budget,
    accommodation: {
      covered: accommodation.covered,
      uncoveredNights: accommodation.uncoveredNights,
      totalDays: accommodation.totalDays
    }
  }
}

const toSummary = (report) => ({
  tripId: report.tripId,
  health: report.health,
  budgetStatus: report.budget.status,
  issueCount: report.issueCount,
  errorCount: report.errorCount,
  warningCount: report.warningCount
})

const ISSUE_LABELS = {
  fr: {
    ACCOMMODATION_NIGHT_UNCOVERED: 'Ajouter un hébergement pour la nuit du {date}',
    ACCOMMODATION_MISSING_DATES: 'Hébergement {name} sans dates de check-in/check-out valides',
    ACCOMMODATION_MISSING_LOCATION: 'Hébergement {name} sans ville/adresse (étape {stage})',
    ACCOMMODATION_LOCATION_MISMATCH: 'Hébergement {name} ({location}) incohérent avec l\'étape {stage}',
    ACTIVITY_MISSING_LOCATION: 'Activité {name} sans localisation (étape {stage})',
    ACTIVITY_LOCATION_MISMATCH: 'Activité {name} ({location}) hors lieu de l\'étape {stage}',
    TRANSPORT_MISSING_LOCATION: 'Transport {name} sans lieu de départ/arrivée (étape {stage})',
    TRANSPORT_LOCATION_MISMATCH: 'Transport {name} ({departure} → {arrival}) incohérent avec le contexte de l\'étape {stage}',
    TRANSPORT_ARRIVAL_LOCATION_MISMATCH: 'Transport {name} — arrivée {arrival} incohérente avec l\'étape {stage}',
    TRANSPORT_MISSING_BETWEEN_STAGES: 'Prévoir un transport entre {from} et {to}',
    TRANSPORT_MISSING_OUTBOUND: 'Prévoir un transport depuis {departure} vers {destination}',
    TRANSPORT_MISSING_RETURN: 'Prévoir un transport retour depuis {from} vers {departure}',
    STAGE_DATE_GAP: 'Combler le trou de dates entre {from} et {to} ({gapStart} → {gapEnd})',
    STAGE_BEFORE_TRIP_START: 'L\'étape {stage} commence avant le voyage ({date})',
    STAGE_AFTER_TRIP_END: 'L\'étape {stage} se termine après le voyage ({date})',
    TRIP_DATES_MISSING: 'Renseigner les dates de début et fin du voyage',
    STAGE_NO_ACTIVITIES: 'Ajouter des activités à l\'étape {stage}',
    ACTIVITY_MISSING_DATES: 'Préciser les dates pour l\'activité {name}',
    BUDGET_SLIGHT_OVERRUN: 'Budget légèrement dépassé ({actual} {currency} vs {planned} {currency}, +{percent}%)',
    BUDGET_STRONG_OVERRUN: 'Budget fortement dépassé ({actual} {currency} vs {planned} {currency}, +{percent}%)'
  },
  en: {
    ACCOMMODATION_NIGHT_UNCOVERED: 'Add accommodation for the night of {date}',
    ACCOMMODATION_MISSING_DATES: 'Accommodation {name} missing valid check-in/check-out dates',
    ACCOMMODATION_MISSING_LOCATION: 'Accommodation {name} missing city/address (stage {stage})',
    ACCOMMODATION_LOCATION_MISMATCH: 'Accommodation {name} ({location}) does not match stage {stage}',
    ACTIVITY_MISSING_LOCATION: 'Activity {name} missing location (stage {stage})',
    ACTIVITY_LOCATION_MISMATCH: 'Activity {name} ({location}) outside stage {stage}',
    TRANSPORT_MISSING_LOCATION: 'Transport {name} missing departure/arrival (stage {stage})',
    TRANSPORT_LOCATION_MISMATCH: 'Transport {name} ({departure} → {arrival}) does not match stage context {stage}',
    TRANSPORT_ARRIVAL_LOCATION_MISMATCH: 'Transport {name} — arrival {arrival} does not match stage {stage}',
    TRANSPORT_MISSING_BETWEEN_STAGES: 'Plan transport between {from} and {to}',
    TRANSPORT_MISSING_OUTBOUND: 'Plan transport from {departure} to {destination}',
    TRANSPORT_MISSING_RETURN: 'Plan return transport from {from} to {departure}',
    STAGE_DATE_GAP: 'Fill date gap between {from} and {to} ({gapStart} → {gapEnd})',
    STAGE_BEFORE_TRIP_START: 'Stage {stage} starts before the trip ({date})',
    STAGE_AFTER_TRIP_END: 'Stage {stage} ends after the trip ({date})',
    TRIP_DATES_MISSING: 'Set trip start and end dates',
    STAGE_NO_ACTIVITIES: 'Add activities to stage {stage}',
    ACTIVITY_MISSING_DATES: 'Set dates for activity {name}',
    BUDGET_SLIGHT_OVERRUN: 'Slight budget overrun ({actual} {currency} vs {planned} {currency}, +{percent}%)',
    BUDGET_STRONG_OVERRUN: 'Strong budget overrun ({actual} {currency} vs {planned} {currency}, +{percent}%)'
  }
}

const renderIssueLabel = (issue, language = 'fr') => {
  const lang = ISSUE_LABELS[language] ? language : 'en'
  const template = ISSUE_LABELS[lang][issue.code] || issue.code
  return template.replace(/\{(\w+)\}/g, (_, key) => issue.params?.[key] ?? '')
}

const buildConsistencyFixRequest = (report, language = 'fr') => {
  const lang = language === 'fr' ? 'fr' : 'en'
  const intro = lang === 'fr'
    ? 'Corrige ce voyage pour le rendre cohérent et complet. Résous TOUS les problèmes suivants sans supprimer les éléments déjà réservés (sauf si indispensable) :'
    : 'Fix this trip to make it consistent and complete. Resolve ALL of the following issues without removing reserved items (unless essential):'

  const lines = report.issues
    .filter((i) => i.severity === 'error' || i.severity === 'warning')
    .map((issue, idx) => `${idx + 1}. ${renderIssueLabel(issue, lang)}`)

  const rules = lang === 'fr'
    ? '\n\nRappels : chaque nuit doit avoir un hébergement ; chaque changement de lieu doit avoir un transport ; chaque activité/hébergement/transport doit être localisé dans la ville de son étape ; respecter le budget si possible ; inclure lieu, adresse, dates/heures, coût, type et description pour chaque modification.'
    : '\n\nReminders: each night needs accommodation; each location change needs transport; each activity/stay/transport must be located in its stage city; respect budget where possible; include location, address, dates/times, cost, type and description for each change.'

  if (lines.length === 0) {
    return lang === 'fr'
      ? 'Optimise le voyage pour améliorer sa cohérence générale (activités, budget, transports).'
      : 'Optimize the trip to improve overall consistency (activities, budget, transport).'
  }

  return `${intro}\n\n${lines.join('\n')}${rules}`
}

module.exports = {
  validateTripConsistency,
  toSummary,
  buildConsistencyFixRequest,
  renderIssueLabel,
  computeBudgetStatus
}
