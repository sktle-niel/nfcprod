import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { STYLE_IDS } from '@/entities/theme/theme'
import { styleName } from '@/features/dashboard/design/styleWords'
import { LookTabPage } from './LookTabPage'

const { legend } = dashboardCopy.design.look.styles

const open = (search = '') => {
  window.history.replaceState(null, '', `/__look${search}`)
  return render(<LookTabPage />)
}

afterEach(() => window.history.replaceState(null, '', '/'))

describe('LookTabPage', () => {
  it('draws the style picker with every style, with no sign-in', () => {
    open()
    const group = screen.getByRole('group', { name: legend })
    expect(group).toBeInTheDocument()
    for (const id of STYLE_IDS) expect(screen.getByRole('radio', { name: new RegExp(`^${styleName(id)}`) })).toBeInTheDocument()
  })

  it('starts from the style the address names', () => {
    open('?style=gourmet&mode=dark')
    expect(screen.getByRole('radio', { name: new RegExp(`^${styleName('gourmet')}`) })).toBeChecked()
  })

  it('starts from Classic when the address names a style it does not know', () => {
    open('?style=neon')
    expect(screen.getByRole('radio', { name: new RegExp(`^${styleName('classic')}`) })).toBeChecked()
  })
})
