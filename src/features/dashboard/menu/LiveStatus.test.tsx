import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LiveStatus } from './LiveStatus'

describe('LiveStatus', () => {
  it('is a status region even when it has nothing to say', () => {
    render(<LiveStatus message="" version={0} />)
    expect(screen.getByRole('status')).toHaveTextContent(/^$/)
  })

  it('puts the same words in a new node when the version changes, so they are read again', () => {
    const { rerender } = render(<LiveStatus message="Saved Mocha" version={1} />)
    const first = screen.getByText('Saved Mocha')
    rerender(<LiveStatus message="Saved Mocha" version={1} />)
    expect(screen.getByText('Saved Mocha')).toBe(first)
    rerender(<LiveStatus message="Saved Mocha" version={2} />)
    expect(screen.getByText('Saved Mocha')).not.toBe(first)
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })
})
