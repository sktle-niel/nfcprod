import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_THEME, type PhotoShape } from '@/entities/theme/theme'
import { LookProvider, lookOf } from '../look'
import { ProductPhoto } from './ProductPhoto'
import { usePictureOpacity } from './usePictureOpacity'

vi.mock('./usePictureOpacity', () => ({ usePictureOpacity: vi.fn() }))

const sniff = vi.mocked(usePictureOpacity)
const PICTURE = 'data:image/png;base64,AAAA'

function photoElement(photo: PhotoShape, src: string | null) {
  const { container } = render(
    <LookProvider value={lookOf({ ...DEFAULT_THEME, photo })}>
      <ProductPhoto src={src} placeholder="cup" />
    </LookProvider>,
  )
  return container.querySelector('[data-shape]')
}

beforeEach(() => {
  sniff.mockReset()
  sniff.mockReturnValue('pending')
})

describe('ProductPhoto on a cut-out look', () => {
  it('frames an opaque picture with rounded corners instead of a floating rectangle', () => {
    sniff.mockReturnValue('opaque')
    expect(photoElement('cutout', PICTURE)).toHaveAttribute('data-shape', 'rounded')
    expect(sniff).toHaveBeenCalledWith(PICTURE)
  })

  it('keeps the cut-out for a picture with see-through parts', () => {
    sniff.mockReturnValue('clear')
    expect(photoElement('cutout', PICTURE)).toHaveAttribute('data-shape', 'cutout')
  })

  it('keeps the cut-out while the pixels are still unknown', () => {
    expect(photoElement('cutout', PICTURE)).toHaveAttribute('data-shape', 'cutout')
  })

  it('keeps the cut-out for the placeholder drawing and reads no pixels for it', () => {
    expect(photoElement('cutout', null)).toHaveAttribute('data-shape', 'cutout')
    expect(sniff).toHaveBeenCalledWith(null)
  })
})

describe('ProductPhoto on the framed looks', () => {
  it('never reads pixels for a shape that fits any picture', () => {
    expect(photoElement('rounded', PICTURE)).toHaveAttribute('data-shape', 'rounded')
    expect(sniff).toHaveBeenCalledWith(null)
  })
})
