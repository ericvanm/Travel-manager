import api from './auth'

export interface TripAdaptSynthesis {
  title: string
  summary: string
  highlights: string[]
  warnings: string[]
  stageOverview?: string[]
  stats?: {
    stageCount: number
    activityCount: number
    totalCost: number
    reservedCount: number
    toBookCount: number
  }
}

export interface AdaptChange {
  action: 'update' | 'create' | 'delete'
  entityType: 'trip' | 'stage' | 'activity'
  entityId?: number
  stageId?: number
  location?: string | null
  address?: string | null
  flightNumber?: string | null
  airline?: string | null
  departureAirport?: string | null
  arrivalAirport?: string | null
  departureLocation?: string | null
  arrivalLocation?: string | null
  confirmationCode?: string | null
  confirmationNumber?: string | null
  startDateTime?: string | null
  endDateTime?: string | null
  estimatedCost?: number | null
  activityType?: string | null
  description?: string | null
  data?: Record<string, unknown>
}

export interface ReservedImpact {
  entityId: number
  entityType: string
  name?: string
  reservationStatus?: string
  changeDescription?: string
  reason?: string
}

export interface AccommodationWarnings {
  covered: boolean
  uncoveredNights: string[]
  totalDays: number
  accommodationCount: number
}

export interface ProposedAdaptation {
  summary: string
  changes: AdaptChange[]
  reservedWarnings?: ReservedImpact[]
  source?: string
}

export interface AdaptSession {
  sessionId: number
  synthesis: TripAdaptSynthesis
}

export const startAdaptSession = async (tripId: number): Promise<AdaptSession> => {
  const response = await api.post(`/ai-adapt/trips/${tripId}/start`)
  return {
    sessionId: response.data.sessionId,
    synthesis: response.data.synthesis
  }
}

export const proposeAdaptation = async (
  sessionId: number,
  adaptationRequest: string
): Promise<{
  proposedChanges: ProposedAdaptation
  reservedImpacts: ReservedImpact[]
  hasReservedImpacts: boolean
  accommodationWarnings: AccommodationWarnings
}> => {
  const response = await api.post(`/ai-adapt/sessions/${sessionId}/propose`, { adaptationRequest })
  return response.data
}

export const acceptAdaptation = async (
  sessionId: number
): Promise<{
  applied: Record<string, number> & { accommodationAutoFilled?: number }
  accommodationWarnings: AccommodationWarnings
  message?: string
}> => {
  const response = await api.post(`/ai-adapt/sessions/${sessionId}/accept`)
  return response.data
}

export const rejectAdaptation = async (sessionId: number): Promise<void> => {
  await api.post(`/ai-adapt/sessions/${sessionId}/reject`)
}

export interface ResolveConsistencyResult {
  success: boolean
  alreadyConsistent: boolean
  sessionId?: number
  adaptationRequest?: string
  proposedChanges?: ProposedAdaptation
  reservedImpacts?: ReservedImpact[]
  hasReservedImpacts?: boolean
  accommodationWarnings?: AccommodationWarnings
  consistency?: import('./tripConsistency').TripConsistencyReport
}

export const resolveTripConsistency = async (tripId: number): Promise<ResolveConsistencyResult> => {
  const response = await api.post(`/ai-adapt/trips/${tripId}/resolve-consistency`)
  return response.data
}
