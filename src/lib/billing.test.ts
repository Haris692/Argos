import { describe, expect, it } from 'vitest'
import {
  computeTicketBilling,
  formatMinutes,
  isAfterHours,
  type BillingEntry,
  type BillingSettings,
} from './billing'

const settings: BillingSettings = {
  hourlyRate: 30,
  afterHoursMultiplier: 1.5,
  minimumMinutes: 30,
  incrementMinutes: 15,
}

function entry(overrides: Partial<BillingEntry> = {}): BillingEntry {
  return { date: '2026-07-06', durationMinutes: 10, afterHours: false, ...overrides }
}

describe('computeTicketBilling — spec cases (section 6, phase 2)', () => {
  it('10 min → 30 min billed (minimum applied)', () => {
    const result = computeTicketBilling([entry({ durationMinutes: 10 })], settings)
    expect(result.billedMinutes).toBe(30)
    expect(result.days[0].minimumApplied).toBe(true)
    expect(result.amount).toBe(15) // 30 min at 30 €/h
  })

  it('35 min → 45 min billed (rounded up to 15-min increment)', () => {
    const result = computeTicketBilling([entry({ durationMinutes: 35 })], settings)
    expect(result.billedMinutes).toBe(45)
    expect(result.days[0].minimumApplied).toBe(false)
    expect(result.days[0].roundingApplied).toBe(true)
    expect(result.amount).toBe(22.5)
  })

  it('46 min → 60 min billed', () => {
    const result = computeTicketBilling([entry({ durationMinutes: 46 })], settings)
    expect(result.billedMinutes).toBe(60)
    expect(result.amount).toBe(30)
  })

  it('two 10-min entries, same ticket, same day → 30 min billed once, not twice', () => {
    const result = computeTicketBilling(
      [entry({ durationMinutes: 10 }), entry({ durationMinutes: 10 })],
      settings,
    )
    expect(result.realMinutes).toBe(20)
    expect(result.billedMinutes).toBe(30)
    expect(result.days).toHaveLength(1)
    expect(result.days[0].minimumApplied).toBe(true)
    expect(result.amount).toBe(15)
  })

  it('intervention started at 20:00 → after-hours rate (45 €/h)', () => {
    expect(isAfterHours('2026-07-06', '20:00')).toBe(true) // Monday 20:00
    const result = computeTicketBilling(
      [entry({ durationMinutes: 60, afterHours: true })],
      settings,
    )
    expect(result.billedMinutes).toBe(60)
    expect(result.afterHoursBilledMinutes).toBe(60)
    expect(result.amount).toBe(45)
  })

  it('non-billable ticket → 0 minutes, 0 €', () => {
    const result = computeTicketBilling([entry({ durationMinutes: 120 })], settings, false)
    expect(result.billedMinutes).toBe(0)
    expect(result.amount).toBe(0)
    expect(result.realMinutes).toBe(120) // real time still tracked
  })
})

describe('computeTicketBilling — additional rules', () => {
  it('exact multiples are not rounded: 30 → 30, 45 → 45', () => {
    expect(computeTicketBilling([entry({ durationMinutes: 30 })], settings).billedMinutes).toBe(30)
    expect(computeTicketBilling([entry({ durationMinutes: 45 })], settings).billedMinutes).toBe(45)
    const result = computeTicketBilling([entry({ durationMinutes: 45 })], settings)
    expect(result.days[0].minimumApplied).toBe(false)
    expect(result.days[0].roundingApplied).toBe(false)
  })

  it('entries on different days each get their own minimum', () => {
    const result = computeTicketBilling(
      [
        entry({ date: '2026-07-06', durationMinutes: 10 }),
        entry({ date: '2026-07-07', durationMinutes: 10 }),
      ],
      settings,
    )
    expect(result.days).toHaveLength(2)
    expect(result.billedMinutes).toBe(60)
    expect(result.amount).toBe(30)
  })

  it('mixed normal + after-hours on the same day: billed minutes apportioned pro rata', () => {
    // 30 real normal + 30 real after-hours = 60 real → 60 billed, split 30/30
    const result = computeTicketBilling(
      [
        entry({ durationMinutes: 30, afterHours: false }),
        entry({ durationMinutes: 30, afterHours: true }),
      ],
      settings,
    )
    expect(result.billedMinutes).toBe(60)
    expect(result.normalBilledMinutes).toBe(30)
    expect(result.afterHoursBilledMinutes).toBe(30)
    expect(result.amount).toBe(15 + 22.5)
  })

  it('no entries → 0', () => {
    const result = computeTicketBilling([], settings)
    expect(result.billedMinutes).toBe(0)
    expect(result.amount).toBe(0)
  })

  it('settings come from the client, not constants: custom rates are honored', () => {
    const custom: BillingSettings = {
      hourlyRate: 50,
      afterHoursMultiplier: 2,
      minimumMinutes: 60,
      incrementMinutes: 30,
    }
    const result = computeTicketBilling([entry({ durationMinutes: 10 })], custom)
    expect(result.billedMinutes).toBe(60)
    expect(result.amount).toBe(50)
    const ah = computeTicketBilling([entry({ durationMinutes: 90, afterHours: true })], custom)
    expect(ah.billedMinutes).toBe(90)
    expect(ah.amount).toBe(150) // 1.5 h × 50 × 2
  })
})

describe('isAfterHours', () => {
  it('weekday inside business hours is normal', () => {
    expect(isAfterHours('2026-07-06', '09:00')).toBe(false) // Monday 9:00 sharp
    expect(isAfterHours('2026-07-08', '12:30')).toBe(false)
    expect(isAfterHours('2026-07-10', '17:59')).toBe(false)
  })

  it('weekday outside 9:00–18:00 is after-hours', () => {
    expect(isAfterHours('2026-07-06', '08:59')).toBe(true)
    expect(isAfterHours('2026-07-06', '18:00')).toBe(true)
    expect(isAfterHours('2026-07-06', '20:00')).toBe(true)
  })

  it('weekend is always after-hours', () => {
    expect(isAfterHours('2026-07-11', '10:00')).toBe(true) // Saturday
    expect(isAfterHours('2026-07-12', '14:00')).toBe(true) // Sunday
  })
})

describe('formatMinutes', () => {
  it('formats durations for display', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(90)).toBe('1 h 30')
    expect(formatMinutes(125)).toBe('2 h 05')
  })
})
