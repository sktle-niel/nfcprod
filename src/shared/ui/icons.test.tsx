import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as icons from './icons'

describe('icons', () => {
  it.each(Object.entries(icons))('%s draws a hidden 24x24 stroke icon that takes a size', (_, Icon) => {
    const { container } = render(<Icon size={30} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('width', '30')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
  })
})
