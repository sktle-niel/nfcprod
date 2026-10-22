import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it.each([
    ['new', 'New'],
    ['confirmed', 'Confirmed'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ] as const)('writes %s as a word', (status, word) => {
    render(<StatusPill status={status} />)
    expect(screen.getByText(word)).toBeInTheDocument()
  })
})
