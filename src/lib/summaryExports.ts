// CSV and PDF exports of the monthly billing summary.
// Reminder: this is a "bon à facturer" to re-enter in a compliant invoicing
// tool — deliberately no invoice number, no legal mentions, no VAT.

import { jsPDF } from 'jspdf'
import type { Client } from '@/types'
import type { BillingSummaryComputation } from '@/lib/billingSummary'
import { formatAmount, formatMinutes } from '@/lib/billing'
import { formatMonth } from '@/lib/months'

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

export function exportSummaryCsv(
  summary: BillingSummaryComputation,
  client: Client,
  month: string,
): void {
  const sep = ';' // French Excel expects semicolons
  const rows: string[][] = [
    ['Type', 'Référence', 'Libellé', 'Min réelles', 'Min facturées', 'Dont hors horaires (min)', 'Montant HT (€)'],
  ]
  if (summary.subscriptionAmount > 0) {
    rows.push(['Abonnement', '', 'Supervision mensuelle', '', '', '', summary.subscriptionAmount.toFixed(2)])
  }
  for (const line of summary.lines) {
    rows.push([
      'Temps passé',
      line.reference,
      line.title,
      String(line.realMinutes),
      String(line.billedMinutes),
      String(line.afterHoursMinutes),
      line.amount.toFixed(2),
    ])
  }
  rows.push([])
  rows.push(['Total HT', '', '', '', String(summary.billableMinutes), String(summary.afterHoursMinutes), summary.totalAmount.toFixed(2)])

  const csv = rows
    .map((r) => r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(sep))
    .join('\r\n')
  // BOM so Excel opens UTF-8 accents correctly
  downloadBlob(`﻿${csv}`, `bon-a-facturer-${slug(client.name)}-${month}.csv`, 'text/csv;charset=utf-8')
}

const PAGE_WIDTH = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

export function exportSummaryPdf(
  summary: BillingSummaryComputation,
  client: Client,
  month: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text('Bon à facturer', MARGIN, y)
  y += 8
  doc.setFontSize(13)
  doc.setTextColor(80)
  doc.text(`${client.name} — ${formatMonth(month)}`, MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(130)
  doc.text(
    `Récapitulatif interne généré le ${new Date().toLocaleDateString('fr-FR')} — ceci n'est pas une facture.`,
    MARGIN,
    y,
  )
  y += 10

  function row(cols: [string, string, string, string], bold = false, size = 9) {
    if (y > 270) {
      doc.addPage()
      y = MARGIN
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(bold ? 30 : 60)
    const titleLines = doc.splitTextToSize(cols[0], 95) as string[]
    doc.text(titleLines[0] + (titleLines.length > 1 ? '…' : ''), MARGIN, y)
    doc.text(cols[1], MARGIN + 105, y, { align: 'right' })
    doc.text(cols[2], MARGIN + 135, y, { align: 'right' })
    doc.text(cols[3], MARGIN + CONTENT_WIDTH, y, { align: 'right' })
    y += 6
  }

  row(['Libellé', 'Réel', 'Facturé', 'Montant HT'], true, 10)
  doc.setDrawColor(180)
  doc.line(MARGIN, y - 4, MARGIN + CONTENT_WIDTH, y - 4)

  if (summary.subscriptionAmount > 0) {
    row(['Abonnement supervision mensuelle', '', '', formatAmount(summary.subscriptionAmount)])
  }
  for (const line of summary.lines) {
    row([
      `${line.reference} — ${line.title}${line.billable ? '' : ' (non facturable)'}`,
      formatMinutes(line.realMinutes),
      formatMinutes(line.billedMinutes),
      formatAmount(line.amount),
    ])
  }

  y += 2
  doc.setDrawColor(180)
  doc.line(MARGIN, y - 4, MARGIN + CONTENT_WIDTH, y - 4)
  if (summary.afterHoursMinutes > 0) {
    row(
      ['Dont interventions hors horaires', '', formatMinutes(summary.afterHoursMinutes), formatAmount(summary.afterHoursAmount)],
      false,
    )
  }
  row(['Total HT', '', formatMinutes(summary.billableMinutes), formatAmount(summary.totalAmount)], true, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(
    'Document interne — à ressaisir dans l\'outil de facturation conforme.',
    PAGE_WIDTH / 2,
    290,
    { align: 'center' },
  )

  doc.save(`bon-a-facturer-${slug(client.name)}-${month}.pdf`)
}
