import { describe, expect, it } from 'vitest'
import { fadeIn } from './fadeIn'

const picture = (complete: boolean) => {
  const image = document.createElement('img')
  Object.defineProperty(image, 'complete', { value: complete })
  return image
}

describe('fadeIn', () => {
  it('leaves a picture that is already there alone', () => {
    const image = picture(true)
    expect(fadeIn(image)).toBeUndefined()
    expect(image).not.toHaveAttribute('data-arriving')
  })

  it.each(['load', 'error'])('holds a picture on its way until %s', (event) => {
    const image = picture(false)
    fadeIn(image)
    expect(image).toHaveAttribute('data-arriving')
    image.dispatchEvent(new Event(event))
    expect(image).not.toHaveAttribute('data-arriving')
  })

  it('lets go when the row goes away', () => {
    const image = picture(false)
    fadeIn(image)?.()
    expect(image).not.toHaveAttribute('data-arriving')
  })
})
