// Billing engine — pure functions, no I/O, no Supabase.
// This is the only part of the codebase where a bug costs money:
// every rule here mirrors section 2 of SPEC-Argos.md and is covered
// by unit tests in billing.test.ts.

export interface BillingSettings {
  hourlyRate: number
  afterHoursMultiplier: number
  minimumMinutes: number
  incrementMinutes: number
}

export interface BillingEntry {
  date: string // YYYY-MM-DD
  durationMinutes: number
  afterHours: boolean
}

export interface DayBreakdown {
  date: string
  realMinutes: number
  billedMinutes: number
  minimumApplied: boolean
  roundingApplied: boolean
  normalBilledMinutes: number
  afterHoursBilledMinutes: number
  amount: number
}

export interface TicketBilling {
  realMinutes: number
  billedMinutes: number
  normalBilledMinutes: number
  afterHoursBilledMinutes: number
  amount: number
  days: DayBreakdown[]
}

function roundUpToIncrement(minutes: number, increment: number): number {
  return Math.ceil(minutes / increment) * increment
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Compute billed minutes and amount for one ticket.
 *
 * Rules (SPEC section 2):
 * - Rounding applies per ticket AND per day, never per entry.
 * - Each (ticket, day) group is billed max(minimum, real rounded up to increment).
 * - After-hours minutes are billed at hourlyRate × afterHoursMultiplier.
 *   When a day mixes normal and after-hours entries, billed minutes are
 *   apportioned proportionally to real minutes.
 * - A non-billable ticket bills 0 minutes and 0 €.
 */
export function computeTicketBilling(
  entries: BillingEntry[],
  settings: BillingSettings,
  billable: boolean = true,
): TicketBilling {
  const empty: TicketBilling = {
    realMinutes: entries.reduce((sum, e) => sum + e.durationMinutes, 0),
    billedMinutes: 0,
    normalBilledMinutes: 0,
    afterHoursBilledMinutes: 0,
    amount: 0,
    days: [],
  }
  if (!billable || entries.length === 0) return empty

  const byDay = new Map<string, BillingEntry[]>()
  for (const entry of entries) {
    const group = byDay.get(entry.date)
    if (group) group.push(entry)
    else byDay.set(entry.date, [entry])
  }

  const days: DayBreakdown[] = []
  for (const [date, group] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const realMinutes = group.reduce((sum, e) => sum + e.durationMinutes, 0)
    if (realMinutes <= 0) continue

    const rounded = roundUpToIncrement(realMinutes, settings.incrementMinutes)
    const billedMinutes = Math.max(settings.minimumMinutes, rounded)
    const minimumApplied =
      realMinutes < settings.minimumMinutes && billedMinutes === settings.minimumMinutes
    const roundingApplied = !minimumApplied && billedMinutes > realMinutes

    // Apportion billed minutes between normal and after-hours rates,
    // proportionally to real minutes at each rate.
    const afterHoursReal = group
      .filter((e) => e.afterHours)
      .reduce((sum, e) => sum + e.durationMinutes, 0)
    const afterHoursBilledMinutes = Math.round((afterHoursReal / realMinutes) * billedMinutes)
    const normalBilledMinutes = billedMinutes - afterHoursBilledMinutes

    const amount = round2(
      (normalBilledMinutes / 60) * settings.hourlyRate +
        (afterHoursBilledMinutes / 60) * settings.hourlyRate * settings.afterHoursMultiplier,
    )

    days.push({
      date,
      realMinutes,
      billedMinutes,
      minimumApplied,
      roundingApplied,
      normalBilledMinutes,
      afterHoursBilledMinutes,
      amount,
    })
  }

  return {
    realMinutes: empty.realMinutes,
    billedMinutes: days.reduce((sum, d) => sum + d.billedMinutes, 0),
    normalBilledMinutes: days.reduce((sum, d) => sum + d.normalBilledMinutes, 0),
    afterHoursBilledMinutes: days.reduce((sum, d) => sum + d.afterHoursBilledMinutes, 0),
    amount: round2(days.reduce((sum, d) => sum + d.amount, 0)),
    days,
  }
}

/**
 * Business hours: Monday to Friday, 09:00 (inclusive) to 18:00 (exclusive).
 * Anything else — evening, early morning, weekend — is after-hours.
 * The rate is determined by the intervention's start time (SPEC section 2).
 */
export function isAfterHours(date: string, startTime: string): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay() // 0 = Sunday
  if (dayOfWeek === 0 || dayOfWeek === 6) return true
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  return totalMinutes < 9 * 60 || totalMinutes >= 18 * 60
}

/** "1 h 30" / "45 min" — display helper shared by all screens. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
