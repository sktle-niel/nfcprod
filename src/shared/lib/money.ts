// Money is stored as integer centavos (PHP only). Never floats.
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const pesoWhole = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

export function formatPeso(centavos: number): string {
  if (!Number.isInteger(centavos)) throw new RangeError('centavos must be an integer')
  const formatter = centavos % 100 === 0 ? pesoWhole : peso
  return formatter.format(centavos / 100)
}
