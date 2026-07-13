import { describe, expect, it } from 'vitest'
import { computeBillingSummary, type SummaryClientSettings, type SummaryTicketInput } from './billingSummary'

const settings: SummaryClientSettings = {
  hourlyRate: 30,
  afterHoursMultiplier: 1.5,
  minimumMinutes: 30,
  incrementMinutes: 15,
  subscriptionActive: true,
  subscriptionPrice: 39,
}

function ticket(overrides: Partial<SummaryTicketInput> = {}): SummaryTicketInput {
  return {
    reference: 'TKT-2026-0001',
    title: 'Test',
    billable: true,
    entries: [{ date: '2026-07-06', durationMinutes: 60, afterHours: false }],
    ...overrides,
  }
}

describe('computeBillingSummary', () => {
  it('subscription is billable only when the monthly report was sent', () => {
    const withReport = computeBillingSummary(settings, [], true)
    expect(withReport.subscriptionAmount).toBe(39)
    expect(withReport.subscriptionBlockedByMissingReport).toBe(false)
    expect(withReport.totalAmount).toBe(39)

    const withoutReport = computeBillingSummary(settings, [], false)
    expect(withoutReport.subscriptionAmount).toBe(0)
    expect(withoutReport.subscriptionBlockedByMissingReport).toBe(true)
    expect(withoutReport.totalAmount).toBe(0)
  })

  it('no subscription line for a client without subscription', () => {
    const result = computeBillingSummary({ ...settings, subscriptionActive: false }, [], false)
    expect(result.subscriptionAmount).toBe(0)
    expect(result.subscriptionBlockedByMissingReport).toBe(false)
  })

  it('aggregates ticket lines with the billing engine rules', () => {
    const result = computeBillingSummary(
      settings,
      [
        ticket({ reference: 'TKT-2026-0001', entries: [{ date: '2026-07-06', durationMinutes: 10, afterHours: false }] }),
        ticket({ reference: 'TKT-2026-0002', entries: [{ date: '2026-07-07', durationMinutes: 65, afterHours: false }] }),
      ],
      true,
    )
    expect(result.lines).toHaveLength(2)
    expect(result.lines[0].billedMinutes).toBe(30) // minimum
    expect(result.lines[1].billedMinutes).toBe(75) // rounded to increment
    expect(result.billableMinutes).toBe(105)
    expect(result.billableAmount).toBe(15 + 37.5)
    expect(result.totalAmount).toBe(39 + 52.5)
  })

  it('non-billable ticket appears as a 0 € line (transparency), not in totals', () => {
    const result = computeBillingSummary(
      settings,
      [ticket({ billable: false, entries: [{ date: '2026-07-06', durationMinutes: 90, afterHours: false }] })],
      true,
    )
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].realMinutes).toBe(90)
    expect(result.lines[0].billedMinutes).toBe(0)
    expect(result.lines[0].amount).toBe(0)
    expect(result.billableAmount).toBe(0)
    expect(result.totalAmount).toBe(39)
  })

  it('tickets without time entries in the month are skipped', () => {
    const result = computeBillingSummary(settings, [ticket({ entries: [] })], true)
    expect(result.lines).toHaveLength(0)
  })

  it('after-hours totals are tracked separately', () => {
    const result = computeBillingSummary(
      settings,
      [ticket({ entries: [{ date: '2026-07-06', durationMinutes: 60, afterHours: true }] })],
      true,
    )
    expect(result.afterHoursMinutes).toBe(60)
    expect(result.afterHoursAmount).toBe(45)
    expect(result.billableAmount).toBe(45)
    expect(result.totalAmount).toBe(84)
  })
})
