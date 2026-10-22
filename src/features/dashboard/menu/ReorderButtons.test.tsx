import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { focusAfterMove, reorderKey, reorderSelectors } from './reorder'
import { ReorderButtons } from './ReorderButtons'

function setup(props: Partial<Parameters<typeof ReorderButtons>[0]> = {}) {
  const onMove = vi.fn()
  render(<ReorderButtons id="hot" upLabel="Move Hot up" downLabel="Move Hot down" first={false} last={false} onMove={onMove} {...props} />)
  return { onMove, user: userEvent.setup() }
}

describe('ReorderButtons', () => {
  it('moves one place up or down with the two arrows', async () => {
    const { onMove, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Move Hot up' }))
    await user.click(screen.getByRole('button', { name: 'Move Hot down' }))
    expect(onMove.mock.calls).toEqual([[-1], [1]])
  })

  it('turns the arrow off at its end of the list', () => {
    setup({ first: true })
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Hot down' })).toBeEnabled()
  })

  it('turns both arrows off while a save runs', () => {
    setup({ busy: true })
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Hot down' })).toBeDisabled()
  })

  it('marks each arrow with the key the focus is given back by', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Move Hot up' })).toHaveAttribute('data-focus', reorderKey.up('hot'))
    expect(screen.getByRole('button', { name: 'Move Hot down' })).toHaveAttribute('data-focus', reorderKey.down('hot'))
  })
})

describe('the focus after a move', () => {
  it('asks first for the arrow that was pressed, then for its twin', () => {
    expect(focusAfterMove('a', -1)).toEqual([reorderKey.up('a'), reorderKey.down('a')])
    expect(focusAfterMove('a', 1)).toEqual([reorderKey.down('a'), reorderKey.up('a')])
  })

  it('finds both arrows by selector, with a quote in the id made harmless', () => {
    expect(reorderSelectors('a"b', 1)).toEqual([`[data-focus="down-a\\"b"]`, `[data-focus="up-a\\"b"]`])
  })
})
