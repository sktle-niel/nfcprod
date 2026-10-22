import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { renderDashboardPage } from '@/test/dashboard'
import { MenuPage } from './MenuPage'

const text = dashboardCopy.shell.menuPage

describe('MenuPage', () => {
  it('opens on the Items tab', async () => {
    await renderDashboardPage(<MenuPage />, '/dashboard/menu')
    expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: text.items })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: text.addons })).toHaveAttribute('aria-selected', 'false')
  })

  it('opens on the tab named in the address', async () => {
    await renderDashboardPage(<MenuPage />, '/dashboard/menu?tab=addons')
    expect(screen.getByRole('tab', { name: text.addons })).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to Items for a tab name it does not know', async () => {
    await renderDashboardPage(<MenuPage />, '/dashboard/menu?tab=nope')
    expect(screen.getByRole('tab', { name: text.items })).toHaveAttribute('aria-selected', 'true')
  })

  it('puts the chosen tab in the address, and keeps the address short for Items', async () => {
    const { user, router } = await renderDashboardPage(<MenuPage />, '/dashboard/menu')

    await user.click(screen.getByRole('tab', { name: text.addons }))
    expect(router.state.location.search).toBe('?tab=addons')

    await user.click(screen.getByRole('tab', { name: text.items }))
    expect(router.state.location.search).toBe('')
  })

  it('moves between the tabs with the arrow keys', async () => {
    const { user } = await renderDashboardPage(<MenuPage />, '/dashboard/menu')
    screen.getByRole('tab', { name: text.items }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: text.addons })).toHaveAttribute('aria-selected', 'true')
  })
})
