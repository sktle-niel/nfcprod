import { describe, expect, it } from 'vitest'
import { arcLength, arcPath, dotArcs, fitStamp, linePath } from './stampFit'

const LONG_TAGLINE = 'Everything on this menu is roasted, brewed and baked in small batches by the two of us'

describe('fitStamp', () => {
  it('sets a short name large on top and the tagline on the bottom arc, in capitals', () => {
    const fit = fitStamp('Cafe Luna', 'Small-batch coffee, brewed slow.')
    expect(fit.top?.text).toBe('CAFE LUNA')
    expect(fit.bottom?.text).toBe('SMALL-BATCH COFFEE, BREWED SLOW.')
    expect(fit).toMatchObject({ nameInRing: true, taglineInRing: true })
  })

  it('makes the name a size smaller when that lets the tagline into the ring', () => {
    const roomy = fitStamp('La Bella', 'Short and sweet')
    const tight = fitStamp('La Bella', 'Seasonal Italian, cooked with patience.')
    expect(tight.taglineInRing).toBe(true)
    expect(tight.top?.size ?? 0).toBeLessThan(roomy.top?.size ?? 0)
  })

  it('leaves a tagline that cannot fit out of the ring, for plain type, and keeps the name at its largest', () => {
    const fit = fitStamp('La Bella', LONG_TAGLINE)
    expect(fit).toMatchObject({ bottom: null, nameInRing: true, taglineInRing: false })
    expect(fit.top?.size).toBe(fitStamp('La Bella', '').top?.size)
  })

  it('draws no bottom line for a business with no tagline', () => {
    expect(fitStamp('Cafe Luna', '   ')).toMatchObject({ bottom: null, taglineInRing: false })
  })

  it('shrinks a longer name to stay within its arc, down to a size a person can read', () => {
    const fit = fitStamp('The Neighbourhood Bakeshop', '')
    expect(fit.nameInRing).toBe(true)
    expect(fit.top?.size).toBeGreaterThanOrEqual(16)
    expect(fit.top?.arc).toBeLessThanOrEqual(215.01)
  })

  it('runs a very long name over both arcs, split at the space nearest its middle, at one size', () => {
    const fit = fitStamp('The Good Neighbourhood Coffee and Bread Company', 'Open daily')
    expect(fit.top?.text).toBe('THE GOOD NEIGHBOURHOOD')
    expect(fit.bottom?.text).toBe('COFFEE AND BREAD COMPANY')
    expect(fit.top?.size).toBe(fit.bottom?.size)
    expect(fit).toMatchObject({ nameInRing: true, taglineInRing: false })
  })

  it('gives up on the ring for a name too long for it, and keeps the tagline there if it fits', () => {
    expect(fitStamp('x'.repeat(60), 'Open daily')).toMatchObject({ nameInRing: false, taglineInRing: true, bottom: null })
    expect(fitStamp('word '.repeat(30), '')).toMatchObject({ top: null, bottom: null, nameInRing: false, taglineInRing: false })
  })

  it('counts a letter outside the basic plane as one', () => {
    expect(fitStamp('\u{1D49C}\u{1D49C}\u{1D49C}', '').top?.arc).toBe(fitStamp('AAA', '').top?.arc)
  })
})

describe('the arcs of the stamp', () => {
  it('reads left to right on both arcs: clockwise on top, counterclockwise on the bottom', () => {
    const line = { text: 'X', size: 20, arc: 90 }
    expect(linePath(line, 'top')).toMatch(/ 0 0 1 /)
    expect(linePath(line, 'bottom')).toMatch(/ 0 0 0 /)
  })

  it('marks an arc over half a circle as the large one', () => {
    expect(arcPath(90, -100, 100)).toMatch(/ 0 1 1 /)
    expect(arcPath(90, -80, 80)).toMatch(/ 0 0 1 /)
  })

  it('measures an arc', () => {
    expect(arcLength(100, 180)).toBeCloseTo(Math.PI * 100, 1)
  })

  it('closes the ring with a run of dots on each side', () => {
    const [right, left] = dotArcs({ top: { text: 'X', size: 20, arc: 100 }, bottom: { text: 'Y', size: 12, arc: 100 } })
    expect(right).not.toBe(left)
    expect(dotArcs({ top: null, bottom: null })).toHaveLength(2)
  })
})
