// Monthly billing summary ("bon à facturer") — pure aggregation logic.
// NOT an invoice: no numbering, no legal mentions, no VAT (SPEC section 2).

import {
  computeTicketBilling,
  type BillingEntry,
  type BillingSettings,
} from '@/lib/billing'

export interface SummaryClientSettings extends BillingSettings {
  subscriptionActive: boolean
  subscriptionPrice: number
}

export interface SummaryTicketInput {
  reference: string
  title: string
  billable: boolean
  entries: BillingEntry[]
}

export interface SummaryLine {
  reference: string
  title: string
  billable: boolean
  realMinutes: number
  billedMinutes: number
  afterHoursMinutes: number
  amount: number
}

export interface BillingSummaryComputation {
  subscriptionAmount: number
  /** true when the subscription is active but the month's report was not sent:
   *  the line is NOT billable without its deliverable (SPEC section 2). */
  subscriptionBlockedByMissingReport: boolean
  lines: SummaryLine[]
  billableMinutes: number
  billableAmount: number
  afterHoursMinutes: number
  afterHoursAmount: number
  totalAmount: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeBillingSummary(
  settings: SummaryClientSettings,
  tickets: SummaryTicketInput[],
  reportSent: boolean,
): BillingSummaryComputation {
  const lines: SummaryLine[] = []

  for (const t of tickets) {
    const billing = computeTicketBilling(t.entries, settings, t.billable)
    if (billing.realMinutes === 0) continue
    lines.push({
      reference: t.reference,
      title: t.title,
      billable: t.billable,
      realMinutes: billing.realMinutes,
      billedMinutes: billing.billedMinutes,
      afterHoursMinutes: billing.afterHoursBilledMinutes,
      amount: billing.amount,
    })
  }
  lines.sort((a, b) => a.reference.localeCompare(b.reference))

  const billableMinutes = lines.reduce((sum, l) => sum + l.billedMinutes, 0)
  const billableAmount = round2(lines.reduce((sum, l) => sum + l.amount, 0))
  const afterHoursMinutes = lines.reduce((sum, l) => sum + l.afterHoursMinutes, 0)
  const afterHoursAmount = round2(
    lines.reduce(
      (sum, l) =>
        sum + (l.afterHoursMinutes / 60) * settings.hourlyRate * settings.afterHoursMultiplier,
      0,
    ),
  )

  // The subscription is only billable when its deliverable (the monthly
  // report) has been sent to the client.
  const subscriptionBillable = settings.subscriptionActive && reportSent
  const subscriptionAmount = subscriptionBillable ? settings.subscriptionPrice : 0

  return {
    subscriptionAmount,
    subscriptionBlockedByMissingReport: settings.subscriptionActive && !reportSent,
    lines,
    billableMinutes,
    billableAmount,
    afterHoursMinutes,
    afterHoursAmount,
    totalAmount: round2(subscriptionAmount + billableAmount),
  }
}
