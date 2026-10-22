import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { STYLE_IDS } from '@/entities/theme/theme'
import { StylesPage } from './StylesPage'

const open = (search = '') =>
  render(
    <MemoryRouter initialEntries={[`/__styles${search}`]}>
      <StylesPage />
    </MemoryRouter>,
  )

describe('StylesPage', () => {
  it('shows every style in light and dark, each in a figure of its own', () => {
    open()
    expect(screen.getAllByRole('figure')).toHaveLength(STYLE_IDS.length * 2)
    expect(screen.getByText('classic / light (native)')).toBeInTheDocument()
    expect(screen.getByText('roast / dark (native)')).toBeInTheDocument()
  })

  it('shows one style or one mode when asked', () => {
    open('?style=gourmet')
    expect(screen.getAllByRole('figure')).toHaveLength(2)
    expect(screen.getByText('gourmet / dark (native)')).toBeInTheDocument()
  })

  it('shows one mode of every style when asked', () => {
    open('?mode=dark')
    expect(screen.getAllByRole('figure')).toHaveLength(STYLE_IDS.length)
  })

  it('ignores a style or a mode it does not know', () => {
    open('?style=neon&mode=sepia')
    expect(screen.getAllByRole('figure')).toHaveLength(STYLE_IDS.length * 2)
  })
})

describe('StylesPage overrides', () => {
  it('changes one choice on top of a style, and ignores a value that is not on its list', () => {
    open('?style=classic&mode=light&card=tile&photo=neon')
    expect(screen.getAllByRole('figure')).toHaveLength(1)
    const root = document.querySelector('[data-menu-card]')
    expect(root?.getAttribute('data-menu-card')).toBe('tile')
    expect(root?.getAttribute('data-menu-photo')).toBe('rounded')
  })

  it('takes a card color and an accent only when they are colors', () => {
    open('?style=classic&mode=light&surface=%23F3E6D3&accent=red')
    const root = document.querySelector<HTMLElement>('[data-menu-card]')
    expect(root?.style.getPropertyValue('--menu-surface')).toBe('#f3e6d3')
    expect(root?.style.getPropertyValue('--menu-accent')).toBe('#2f80ed')
  })
})
