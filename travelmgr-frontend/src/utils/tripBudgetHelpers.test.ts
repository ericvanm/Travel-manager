import { describe, expect, it } from 'vitest'
import {
  mainBudgetCategoryLabelKey,
  sumBudgetItems,
  type TripBudgetLineItem,
} from './tripBudgetHelpers'

describe('tripBudgetHelpers', () => {
  it('sumBudgetItems totals estimated costs', () => {
    const items: TripBudgetLineItem[] = [
      { category: 'activity', name: 'Museum', estimatedCost: 20 },
      { category: 'accommodation', name: 'Hotel', estimatedCost: 80.5 },
    ]
    expect(sumBudgetItems(items)).toBe(100.5)
    expect(sumBudgetItems([])).toBe(0)
  })

  it('mainBudgetCategoryLabelKey maps to translation keys', () => {
    expect(mainBudgetCategoryLabelKey('flights')).toBe('trip_budget_category_flights')
    expect(mainBudgetCategoryLabelKey('other')).toBe('trip_budget_category_other')
  })
})
