// Every date the business talks about is a Philippine date.
const day = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' })

/** "Oct 26, 2026" for a moment in ms. */
export function formatDay(ms: number): string {
  return day.format(ms)
}
