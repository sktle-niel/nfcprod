import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePictureFade } from './usePictureFade'

function Picture({ interactive = true }: { interactive?: boolean }) {
  return <img ref={usePictureFade(interactive)} src="https://images.example.com/a.jpg" alt="" />
}

const picture = () => document.querySelector('img') as HTMLImageElement
const complete = (value: boolean) => vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(value)
const calm = (reduced: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: reduced }))

describe('usePictureFade', () => {
  beforeEach(() => {
    calm(false)
    complete(false)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('holds a picture that is on its way, and lets it go when it has arrived', () => {
    render(<Picture />)
    expect(picture()).toHaveAttribute('data-arriving')
    fireEvent.load(picture())
    expect(picture()).not.toHaveAttribute('data-arriving')
  })

  it('lets a picture go that cannot load', () => {
    render(<Picture />)
    fireEvent.error(picture())
    expect(picture()).not.toHaveAttribute('data-arriving')
  })

  it('leaves a picture alone that is already there', () => {
    complete(true)
    render(<Picture />)
    expect(picture()).not.toHaveAttribute('data-arriving')
  })

  it('leaves every picture alone in the Design preview and under reduced motion', () => {
    const preview = render(<Picture interactive={false} />)
    expect(picture()).not.toHaveAttribute('data-arriving')
    preview.unmount()
    calm(true)
    render(<Picture />)
    expect(picture()).not.toHaveAttribute('data-arriving')
  })
})
