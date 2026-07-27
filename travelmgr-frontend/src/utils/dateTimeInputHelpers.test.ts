import { describe, expect, it } from 'vitest'
import {
  combineDateAndTime,
  getTimePart,
  splitDateTime,
} from './dateTimeInputHelpers'

describe('dateTimeInputHelpers', () => {
  it('splitDateTime parses ISO and space-separated values', () => {
    expect(splitDateTime('2024-03-15T14:30:00Z')).toEqual({
      date: '2024-03-15',
      time: '14:30',
    })
    expect(splitDateTime('2024-03-15 09:05')).toEqual({
      date: '2024-03-15',
      time: '09:05',
    })
    expect(splitDateTime(undefined)).toEqual({ date: '', time: '' })
  })

  it('getTimePart falls back to default when time missing', () => {
    expect(getTimePart('2024-03-15T08:00:00Z')).toBe('08:00')
    expect(getTimePart('2024-03-15', '10:00')).toBe('10:00')
  })

  it('combineDateAndTime builds local-style datetime string', () => {
    expect(combineDateAndTime('2024-03-15', '14:30')).toBe('2024-03-15T14:30')
    expect(combineDateAndTime('', '14:30')).toBe('')
  })
})
