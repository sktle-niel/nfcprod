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
