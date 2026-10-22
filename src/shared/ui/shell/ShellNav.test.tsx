import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { IconOverview } from '../icons'
import { ShellNav } from './ShellNav'

function items(count: number) {
  return Array.from({ length: count }, (_, index) => ({ to: `/p${index}`, label: `Page ${index}`, Icon: IconOverview }))
}

function list(count: number) {
  render(
    <MemoryRouter>
      <ShellNav label="Area" items={items(count)} />
    </MemoryRouter>,
  )
  return screen.getByRole('list')
}

describe('ShellNav', () => {
  it('marks a bar of five tabs as dense, so they share the phone row instead of running off the screen', () => {
    expect(list(5)).toHaveAttribute('data-dense', 'true')
  })

  it('leaves a bar of four tabs as it was', () => {
    expect(list(4)).not.toHaveAttribute('data-dense')
  })
})
