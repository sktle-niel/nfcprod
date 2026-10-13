// The business runs on Philippine time, wherever the admin happens to be.
const ZONE = 'Asia/Manila'
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE })
const shortDay = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: ZONE })

/** "Oct 13, 2026, 12:12 pm". A value that is not a date is shown as it came. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date)
}

/** "Oct 13". */
export function formatDay(value: string | number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : shortDay.format(date)
}

/** +639171234567 becomes 0917 123 4567, the way people write and dial PH mobile numbers. */
export function formatMobile(phone: string): string {
  return phone.replace(/^\+63(9\d{2})(\d{3})(\d{4})$/, '0$1 $2 $3')
}

/** 12.5 becomes "12.5%", 12 becomes "12%". The sign is left to the caller. */
export function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1).replace(/\.0$/, '')}%`
}

/** "Maria Angelica Santos" becomes "MS". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}
