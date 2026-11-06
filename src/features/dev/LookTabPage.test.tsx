import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LookTabPage } from './LookTabPage'

const look = dashboardCopy.design.look

const open = (search = '') => {
  window.history.replaceState(null, '', `/__look${search}`)
  return render(<LookTabPage />)
}

afterEach(() => window.history.replaceState(null, '', '/'))

describe('LookTabPage', () => {
  it('draws Light or dark, the templates and the two parts of the look with no sign-in', () => {
    open()
    const mode = within(screen.getByRole('group', { name: look.mode.label }))
    expect(mode.getByRole('button', { name: look.mode.options.light })).toHaveAttribute('aria-pressed', 'true')
    const parts = within(screen.getByRole('group', { name: look.sections.label }))
    expect(parts.getAllByRole('button').map((button) => button.textContent)).toEqual([look.sections.options.colors, look.sections.options.extras])
    expect(screen.getByText(look.primary)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: look.styles.legend })).toBeInTheDocument()
  })

  it('opens the part the address names, and Colors for one the tab no longer has', () => {
    const { unmount } = open('?part=extras')
    expect(screen.getByRole('group', { name: look.backdrop.legend })).toBeInTheDocument()
    unmount()

    open('?part=cards')
    expect(screen.getByText(look.primary)).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: look.backdrop.legend })).not.toBeInTheDocument()
  })

  it('starts from the saved style and mode the address names, and draws that menu in the plain look', () => {
    open('?style=gourmet&mode=dark')
    expect(within(screen.getByRole('group', { name: look.mode.label })).getByRole('button', { name: look.mode.options.dark })).toHaveAttribute('aria-pressed', 'true')
    const root = document.querySelector('[data-menu-card]')
    expect(root).toHaveAttribute('data-menu-card', 'row')
    expect(root).toHaveAttribute('data-menu-header', 'plain')
  })

  it('draws the photo library picker in the Extras part with no sign-in: the page gives it the kinds of business', async () => {
    open('?part=extras')
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Photo library' }))
    expect(screen.getByRole('combobox', { name: 'Kind of business' })).toHaveValue('coffee')
  })
})
