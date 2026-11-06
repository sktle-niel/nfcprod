import { describe, expect, it } from 'vitest'
import { PRESETS } from './index'
import { presetPhoto } from './samplePhotos'

describe('the photos of the example items', () => {
  it('gives the coffee example items a real photo, the croissant among them', () => {
    expect(PRESETS.coffee.samples.every(({ name }) => presetPhoto(name) !== null)).toBe(true)
    expect(presetPhoto('Butter Croissant')).toBe('/sample/pastry-1.jpg')
  })

  it('gives none to an item with no photo that fits', () => {
    expect(presetPhoto('Halo-Halo')).toBeNull()
  })
})
