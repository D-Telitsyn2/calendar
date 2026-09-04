import { describe, expect, it } from 'vitest'
import {
  formatDate,
  getDaysCount,
  isDateInRange,
  isVacationInYear,
  toStoredTimestamp
} from './dateUtils'

describe('getDaysCount', () => {
  it('считает дни включительно', () => {
    expect(getDaysCount(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(1)
    expect(getDaysCount(new Date(2026, 0, 1), new Date(2026, 0, 10))).toBe(10)
  })
})

describe('formatDate', () => {
  it('форматирует как дд.мм.гггг', () => {
    expect(formatDate(new Date(2026, 8, 4))).toBe('04.09.2026')
  })
})

describe('isDateInRange', () => {
  it('включает границы', () => {
    const start = new Date(2026, 5, 1)
    const end = new Date(2026, 5, 10)
    expect(isDateInRange(new Date(2026, 5, 1), start, end)).toBe(true)
    expect(isDateInRange(new Date(2026, 5, 10), start, end)).toBe(true)
    expect(isDateInRange(new Date(2026, 5, 11), start, end)).toBe(false)
  })
})

describe('isVacationInYear', () => {
  it('видит отпуск, который задевает год', () => {
    expect(isVacationInYear(new Date(2025, 11, 20), new Date(2026, 0, 5), 2026)).toBe(true)
    expect(isVacationInYear(new Date(2025, 5, 1), new Date(2025, 5, 10), 2026)).toBe(false)
  })
})

describe('toStoredTimestamp', () => {
  it('кладёт полдень UTC, чтобы день не съезжал по поясам', () => {
    const stored = toStoredTimestamp(new Date(2026, 0, 15))
    expect(stored.toISOString()).toBe('2026-01-15T12:00:00.000Z')
  })
})
