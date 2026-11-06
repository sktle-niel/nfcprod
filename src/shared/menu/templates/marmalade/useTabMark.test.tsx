import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTabMark } from './useTabMark'

function Harness({ active, interactive = true }: { active: number; interactive?: boolean }) {
  const row = useRef<HTMLUListElement>(null)
  useTabMark(row, active, interactive)
  return (
    <ul ref={row} aria-label="tabs">
      <li>One</li>
      <li>Two</li>
    </ul>
  )
}

const row = () => screen.getByRole('list', { name: 'tabs' })

describe('useTabMark', () => {
  afterEach(() => vi.restoreAllMocks())

  it('places the mark under the tab being read', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(40)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(70)
    render(<Harness active={1} />)
    expect(row().style.getPropertyValue('--tpl-mark-x')).toBe('40')
    expect(row().style.getPropertyValue('--tpl-mark-width')).toBe('70')
  })

  it('does not glide at page load, only once the reader has moved', () => {
    const { rerender } = render(<Harness active={0} />)
    expect(row()).not.toHaveAttribute('data-moved')
    rerender(<Harness active={1} />)
    expect(row()).toHaveAttribute('data-moved')
  })

  it('never glides in the preview', () => {
    const { rerender } = render(<Harness active={0} interactive={false} />)
    rerender(<Harness active={1} interactive={false} />)
    expect(row()).not.toHaveAttribute('data-moved')
  })

  it('does nothing past the end of the row', () => {
    render(<Harness active={5} />)
    expect(row().style.getPropertyValue('--tpl-mark-x')).toBe('')
  })
})
