const backendUrl = () => import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api'

export interface TripPlanningFormData {
  departureLocation: string
  geographicZone: string
  durationDays: number
  startDate?: string | null
  travelStyle: string
  localTransport: string
  accommodationType: string
  budget: number
  currency: string
}

export interface TransportOption {
  mode: string
  label: string
  estimatedCost: number
  durationHint?: string
}

export interface PlanningValidation {
  isValid: boolean
  formData: TripPlanningFormData
  errors: string[]
  warnings: string[]
}

export interface PlanningSynthesis {
  title: string
  summary: string
  highlights: string[]
  warnings: string[]
  estimatedDailyBudget: number
  outboundTransportOptions?: TransportOption[]
  recommendedOutboundTransport?: TransportOption
  source?: string
}

export interface GeoPoint {
  lat: number
  lng: number
  label: string
  type: 'departure' | 'stage' | 'activity' | 'accommodation'
  transportMode?: string
  estimatedCost?: number
}

export interface RouteSegment {
  from: GeoPoint
  to: GeoPoint
  transportMode: string
  estimatedCost: number
  label: string
}

export interface BudgetLineItem {
  category: 'transport_outbound' | 'transport_return' | 'transport_local' | 'accommodation' | 'activity' | 'other'
  name: string
  estimatedCost: number
  date?: string
}

export interface TransportLeg {
  mode: string
  label: string
  description?: string
  estimatedCost: number
  departureLocation?: string
  arrivalLocation?: string
  activityType?: string
}

export interface PlannedActivity {
  name: string
  activityType: string
  startDateTime: string
  endDateTime: string
  city?: string
  comments?: string
  estimatedCost?: number
  latitude?: number | null
  longitude?: number | null
}

export interface PlannedAccommodation {
  name: string
  type: string
  checkInDate: string
  checkOutDate: string
  estimatedCost?: number
  latitude?: number | null
  longitude?: number | null
}

export interface PlannedStage {
  name: string
  countryCode?: string | null
  startDate: string
  endDate: string
  latitude?: number | null
  longitude?: number | null
  activities: PlannedActivity[]
  accommodations: PlannedAccommodation[]
}

export interface PlannedItinerary {
  title: string
  textItinerary: string
  images: { url: string; caption: string }[]
  transportRoute: string
  outboundTransport?: TransportLeg
  returnTransport?: TransportLeg
  budgetBreakdown?: BudgetLineItem[]
  mapPoints?: GeoPoint[]
  routeSegments?: RouteSegment[]
  trip: {
    name: string
    description: string
    startDate: string
    endDate: string
    budget: number
    currency: string
  }
  stages: PlannedStage[]
  source?: string
}

export interface TripPlanningSession {
  id: number
  userId?: number | null
  status: string
  formData: TripPlanningFormData
  synthesis?: PlanningSynthesis | null
  itinerary?: PlannedItinerary | null
  revisionCount: number
  revisionFeedback?: string | null
  tripId?: number | null
  createdAt?: string
  updatedAt?: string
}

const jsonFetch = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${backendUrl()}/ai-planning${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`) as Error & { data?: unknown }
    error.data = data
    throw error
  }
  return data
}

export const getPlanningSessions = (): Promise<TripPlanningSession[]> =>
  jsonFetch('/sessions')

export const getPlanningSession = (id: number): Promise<TripPlanningSession> =>
  jsonFetch(`/sessions/${id}`)

export const savePlanningSession = (
  formData: TripPlanningFormData,
  sessionId?: number
): Promise<TripPlanningSession> =>
  jsonFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ formData, sessionId })
  })

export const validatePlanningSession = (
  sessionId: number,
  formData?: TripPlanningFormData
): Promise<{
  success: boolean
  validation: PlanningValidation
  synthesis?: PlanningSynthesis
  requiresConfirmation?: boolean
  requiresFormCorrection?: boolean
}> =>
  jsonFetch(`/sessions/${sessionId}/validate`, {
    method: 'POST',
    body: JSON.stringify({ formData })
  })

export const confirmPlanningSynthesis = (sessionId: number): Promise<{
  success: boolean
  itinerary: PlannedItinerary
}> =>
  jsonFetch(`/sessions/${sessionId}/confirm-synthesis`, { method: 'POST' })

export const revisePlanningItinerary = (
  sessionId: number,
  feedback: string
): Promise<{ success: boolean; itinerary: PlannedItinerary; revisionCount: number }> =>
  jsonFetch(`/sessions/${sessionId}/revise`, {
    method: 'POST',
    body: JSON.stringify({ feedback })
  })

export const acceptPlanningItinerary = (sessionId: number): Promise<{
  success: boolean
  trip: { id: number; name: string }
  message: string
}> =>
  jsonFetch(`/sessions/${sessionId}/accept`, { method: 'POST' })

export const rejectPlanningItinerary = (sessionId: number): Promise<{
  success: boolean
  formData: TripPlanningFormData
  sessionId: number
}> =>
  jsonFetch(`/sessions/${sessionId}/reject`, { method: 'POST' })

export const defaultFormData = (): TripPlanningFormData => ({
  departureLocation: '',
  geographicZone: '',
  durationDays: 7,
  startDate: '',
  travelStyle: '',
  localTransport: '',
  accommodationType: '',
  budget: 1500,
  currency: 'EUR'
})
