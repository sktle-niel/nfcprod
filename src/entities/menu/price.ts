import { LIMITS } from './menu'

// Pesos as people type them: thousands with commas (1,200) or without (1200), and at most two decimals. A comma must
// group three digits, so "12,50" (a decimal comma) is refused instead of being read as 1,250.
const PESOS = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d{0,2}))?$/

/** Centavos of a well-formed price, however large. Null when the text is not a price at all. */
function readCentavos(text: string): number | null {
  if (typeof text !== 'string') return null
  const typed = text.trim().replace(/^₱\s*/, '')
  if (typed.length > 20) return null
  const match = PESOS.exec(typed)
  if (!match) return null
  const whole = (match[1] ?? '').replaceAll(',', '')
  const decimals = match[2] ?? ''
  if (whole === '' && decimals === '') return null
  return Number(whole || '0') * 100 + Number(decimals.padEnd(2, '0'))
}

/**
 * Centavos from a price typed in pesos: "120", "120.5", "1,200.00" and "₱ 45" all work. Null for anything else and for
 * a price above LIMITS.priceMax. The digits are read as text, so 19.99 is exactly 1999: no float rounding.
 */
export function parsePrice(text: string): number | null {
  const centavos = readCentavos(text)
  return centavos !== null && centavos <= LIMITS.priceMax ? centavos : null
}

/**
 * Like `parsePrice`, but a well-formed price above the limit is not refused here: it comes back as one centavo over
 * LIMITS.priceMax, so a form can tell the owner "too high" instead of "badly formed". Null only for text that is no price.
 */
export function readPrice(text: string): number | null {
  const centavos = readCentavos(text)
  return centavos === null ? null : Math.min(centavos, LIMITS.priceMax + 1)
}

/** Centavos as an edit box shows them: "120" for whole pesos, "120.50" otherwise. Empty for a value that is not a price. */
export function priceInput(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) return ''
  const pesos = Math.floor(centavos / 100)
  const cents = centavos % 100
  return cents === 0 ? String(pesos) : `${pesos}.${String(cents).padStart(2, '0')}`
}
