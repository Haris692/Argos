import { jsPDF } from 'jspdf'
import type { Client, MonthlyReport, Ticket } from '@/types'
import { formatMinutes } from '@/lib/billing'
import { formatMonth } from '@/lib/months'
import { TICKET_CATEGORY_LABELS } from '@/types'

export interface TicketActivity {
  ticket: Ticket
  realMinutes: number
}

const PAGE_WIDTH = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const PAGE_BOTTOM = 277

// Client-side PDF generation only — Argos never produces invoices,
// and the monthly report is the visible deliverable of the subscription.
export function generateMonthlyReportPdf(
  report: MonthlyReport,
  client: Client,
  activity: TicketActivity[],
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  function ensureRoom(height: number) {
    if (y + height > PAGE_BOTTOM) {
      doc.addPage()
      y = MARGIN
    }
  }

  function sectionTitle(title: string) {
    ensureRoom(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.text(title, MARGIN, y)
    y += 1.5
    doc.setDrawColor(180)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 6
  }

  function paragraph(text: string, options: { bold?: boolean; size?: number } = {}) {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
    doc.setFontSize(options.size ?? 10)
    doc.setTextColor(50)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[]
    for (const line of lines) {
      ensureRoom(5)
      doc.text(line, MARGIN, y)
      y += 5
    }
  }

  function keyValue(label: string, value: string) {
    ensureRoom(6)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50)
    doc.text(label, MARGIN, y)
    doc.setFont('helvetica', 'bold')
    doc.text(value, MARGIN + 95, y)
    y += 6
  }

  // --- Header ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text('Rapport mensuel de supervision', MARGIN, y)
  y += 8
  doc.setFontSize(13)
  doc.setTextColor(80)
  doc.text(`${client.name} — ${formatMonth(report.month)}`, MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(130)
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')} · Supervision Microsoft 365 et sécurité`,
    MARGIN,
    y,
  )
  y += 4

  // --- Security / Defender ---
  sectionTitle('Sécurité — Microsoft Defender')
  if (report.defender_alerts_reviewed != null) {
    keyValue('Alertes passées en revue', String(report.defender_alerts_reviewed))
    keyValue('Alertes traitées et résolues', String(report.defender_alerts_resolved ?? 0))
    if ((report.defender_alerts_reviewed ?? 0) === 0) {
      paragraph('Aucune alerte de sécurité sur la période : le tenant est sain.')
    }
  } else {
    paragraph('—')
  }

  // --- Devices / Intune ---
  sectionTitle('Conformité des postes — Intune')
  if (report.devices_total != null) {
    keyValue(
      'Postes conformes aux politiques',
      `${report.devices_compliant ?? 0} / ${report.devices_total}`,
    )
  }
  if (report.updates_status) {
    paragraph(`Mises à jour : ${report.updates_status}`)
  }
  if (report.devices_total == null && !report.updates_status) paragraph('—')

  // --- Accounts ---
  sectionTitle('Comptes et accès')
  paragraph(report.accounts_reviewed || '—')

  // --- Month activity ---
  sectionTitle('Interventions du mois')
  if (activity.length === 0) {
    paragraph('Aucune intervention sur la période, en dehors de la supervision continue.')
  } else {
    const totalMinutes = activity.reduce((sum, a) => sum + a.realMinutes, 0)
    paragraph(
      `${activity.length} intervention${activity.length > 1 ? 's' : ''} traitée${activity.length > 1 ? 's' : ''}, ${formatMinutes(totalMinutes)} au total.`,
    )
    y += 2
    for (const { ticket, realMinutes } of activity) {
      ensureRoom(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(40)
      doc.text(`• ${ticket.title}`, MARGIN, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)
      doc.text(formatMinutes(realMinutes), MARGIN + CONTENT_WIDTH, y, { align: 'right' })
      y += 4.5
      doc.setFontSize(9)
      const meta = `${ticket.reference} · ${TICKET_CATEGORY_LABELS[ticket.category]}`
      doc.text(meta, MARGIN + 4, y)
      y += 5.5
      if (ticket.resolution) {
        doc.setTextColor(90)
        const lines = doc.splitTextToSize(ticket.resolution, CONTENT_WIDTH - 4) as string[]
        for (const line of lines.slice(0, 3)) {
          ensureRoom(4.5)
          doc.text(line, MARGIN + 4, y)
          y += 4.5
        }
        y += 1
      }
    }
  }

  // --- Recommendations ---
  sectionTitle('Recommandations')
  paragraph(report.recommendations || 'Aucune recommandation particulière ce mois-ci.')

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `${client.name} — Rapport de supervision ${formatMonth(report.month)} — page ${i}/${pageCount}`,
      PAGE_WIDTH / 2,
      290,
      { align: 'center' },
    )
  }

  doc.save(`rapport-${client.name.toLowerCase().replace(/\s+/g, '-')}-${report.month}.pdf`)
}
