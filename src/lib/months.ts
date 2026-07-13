const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

/** "2026-07" → "juillet 2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${year}`
}

/** First and last day of a YYYY-MM month, as YYYY-MM-DD strings. */
export function monthRange(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number)
  const lastDay = new Date(year, m, 0).getDate()
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` }
}
