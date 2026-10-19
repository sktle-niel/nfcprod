import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlatformIcon } from './PlatformIcon'

describe('PlatformIcon', () => {
  it('gives every Instagram mark its own gradient, so marks on one page never share an id', () => {
    const { container } = render(
      <>
        <PlatformIcon platform="instagram" />
        <PlatformIcon platform="instagram" />
      </>,
    )
    const gradients = [...container.querySelectorAll('svg [id]')]
    expect(gradients).toHaveLength(2)
    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(2)
    for (const gradient of gradients) {
      expect(gradient.closest('svg')?.querySelector('rect')).toHaveAttribute('fill', `url(#${gradient.id})`)
    }
  })
})
