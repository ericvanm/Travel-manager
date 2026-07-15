import { Activity, Stage } from '../types'
import { ACTIVITY_TYPE, isTransportActivityType } from './activityTypes'

export interface TripBudgetLineItem {
  category: string
  name: string
  estimatedCost: number
  date?: string
}

export type MainBudgetCategory = 'flights' | 'local_transport' | 'activities' | 'accommodation' | 'other'

export interface MainBudgetCategoryTotal {
  category: MainBudgetCategory
  total: number
  itemCount: number
}

const MAIN_CATEGORY_ORDER: MainBudgetCategory[] = [
  'flights',
  'local_transport',
  'accommodation',
  'activities',
  'other',
]

const mapToMainCategory = (category: string): MainBudgetCategory => {
  if (category === 'transport_outbound' || category === 'transport_return') return 'flights'
  if (category === 'transport_local') return 'local_transport'
  if (category === 'accommodation') return 'accommodation'
  if (category === 'activity') return 'activities'
  return 'other'
}

const activityDate = (activity: Activity): string | undefined => {
  const raw = activity.startDateTime || activity.checkInDate
  return raw ? String(raw).slice(0, 10) : undefined
}

const classifyTransportCategory = (
  activity: Activity,
  transportActivities: Activity[]
): string => {
  if (activity.activityTypeId === ACTIVITY_TYPE.FLIGHT) {
    const sortedFlights = transportActivities
      .filter((a) => a.activityTypeId === ACTIVITY_TYPE.FLIGHT)
      .sort((a, b) => {
        const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0
        const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0
        return da - db
      })
    if (sortedFlights.length === 0) return 'transport_local'
    if (sortedFlights[0]?.id === activity.id) return 'transport_outbound'
    if (sortedFlights[sortedFlights.length - 1]?.id === activity.id) return 'transport_return'
    return 'transport_local'
  }
  return 'transport_local'
}

const isTransportActivity = (activity: Activity): boolean =>
  isTransportActivityType(activity.activityTypeId)
  || Boolean(activity.departureLocation || activity.departureAirport || activity.pickupLocation)

const activityCost = (activity: Activity): number => {
  if (activity.cost == null) return 0
  const value = Number(activity.cost)
  return Number.isFinite(value) ? value : 0
}

export const buildTripBudgetItems = (stages: Stage[]): TripBudgetLineItem[] => {
  const allActivities = stages.flatMap((stage) => stage.activities || [])
  const transportActivities = allActivities.filter(isTransportActivity)

  return allActivities.map((activity) => {
    let category = 'activity'
    if (activity.activityTypeId === ACTIVITY_TYPE.HOTEL) {
      category = 'accommodation'
    } else if (isTransportActivity(activity)) {
      category = classifyTransportCategory(activity, transportActivities)
    }

    return {
      category,
      name: activity.name || 'Activity',
      estimatedCost: activityCost(activity),
      date: activityDate(activity),
    }
  })
}

export const aggregateMainBudgetCategories = (
  items: TripBudgetLineItem[]
): MainBudgetCategoryTotal[] => {
  const totals = new Map<MainBudgetCategory, MainBudgetCategoryTotal>()

  for (const item of items) {
    const main = mapToMainCategory(item.category)
    const existing = totals.get(main) || { category: main, total: 0, itemCount: 0 }
    existing.total += item.estimatedCost
    existing.itemCount += 1
    totals.set(main, existing)
  }

  return MAIN_CATEGORY_ORDER
    .map((category) => totals.get(category))
    .filter((entry): entry is MainBudgetCategoryTotal => Boolean(entry && entry.itemCount > 0))
}

export const mainBudgetCategoryLabelKey = (category: MainBudgetCategory): string => {
  const keys: Record<MainBudgetCategory, string> = {
    flights: 'trip_budget_category_flights',
    local_transport: 'trip_budget_category_local_transport',
    accommodation: 'trip_budget_category_accommodation',
    activities: 'trip_budget_category_activities',
    other: 'trip_budget_category_other',
  }
  return keys[category]
}

export const planningBudgetCategoryLabelKey = (category: MainBudgetCategory): string => {
  const keys: Record<MainBudgetCategory, string> = {
    flights: 'ai_planning_budget_flights',
    local_transport: 'ai_planning_budget_local_transport',
    accommodation: 'ai_planning_budget_accommodation',
    activities: 'ai_planning_budget_activities',
    other: 'ai_planning_budget_other',
  }
  return keys[category]
}
