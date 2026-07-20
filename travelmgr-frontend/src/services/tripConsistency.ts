import api from './auth'

export type TripHealth = 'ok' | 'warning' | 'error'
export type BudgetStatus = 'ok' | 'none' | 'slight_over' | 'strong_over'
export type ConsistencySeverity = 'error' | 'warning' | 'info'

export interface ConsistencyIssue {
  code: string
  severity: ConsistencySeverity
  params?: Record<string, string | number>
}

export interface TripConsistencyBudget {
  status: BudgetStatus
  planned: number | null
  actual: number
  currency: string
  delta: number | null
  overrunPercent: number | null
}

export interface TripConsistencyReport {
  tripId: number
  health: TripHealth
  issueCount: number
  errorCount: number
  warningCount: number
  issues: ConsistencyIssue[]
  budget: TripConsistencyBudget
  accommodation: {
    covered: boolean
    uncoveredNights: string[]
    totalDays: number
  }
}

export interface TripConsistencySummary {
  tripId: number
  health: TripHealth
  budgetStatus: BudgetStatus
  issueCount: number
  errorCount: number
  warningCount: number
}

export const getTripConsistencySummary = async (): Promise<TripConsistencySummary[]> => {
  const response = await api.get('/trips/consistency/summary')
  return response.data
}

export const getTripConsistency = async (tripId: number): Promise<TripConsistencyReport> => {
  const response = await api.get(`/trips/${tripId}/consistency`)
  return response.data
}
