import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { styleTheme } from '@/entities/theme/styles'
import { renderDashboardApp } from '@/test/dashboard'

const text = dashboardCopy.share.preview
const { shell, overview, share } = dashboardCopy

describe('the owner preview', () => {
  it('shows the owner menu in the public layout: one main, one h1 with the business name, the items and the footer', async () => {
    await renderDashboardApp('/dashboard/preview')
    const title = await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(title.closest('main')).toBe(screen.getByRole('main'))
    // Outside the shell: full width, with no sidebar or tab bar around the menu.
    expect(screen.queryByRole('navigation', { name: shell.menu })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu categories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Americano' })).toBeInTheDocument()
    expect(document.title).toBe(text.title)
  })

  it('puts the way back first, before the menu and its links', async () => {
    const { user } = await renderDashboardApp('/dashboard/preview')
    await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })
    const back = screen.getByRole('link', { name: text.back })
    expect(back).toHaveAttribute('href', '/dashboard')
    await user.tab()
    expect(back).toHaveFocus()
    await user.click(back)
    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: shell.menu })).toBeInTheDocument()
  })

  it('shows a draft in the style the owner chose, and says that only the owner can see it', async () => {
    await renderDashboardApp('/dashboard/preview', {
      seed: async (owner) => {
        await owner.saveBusiness({ theme: styleTheme('sunny', 'light') })
      },
    })
    await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })
    const root = document.querySelector('[data-menu-card]')
    expect(root).toHaveAttribute('data-menu-card', 'badge')
    expect(root).toHaveAttribute('data-menu-header', 'awning')
    expect(screen.getByText(text.note)).toBeInTheDocument()
    expect(screen.queryByText(text.notePaused)).not.toBeInTheDocument()
  })

  it('shows what the owner just changed, not an old copy', async () => {
    await renderDashboardApp('/dashboard/preview', {
      seed: async (owner) => {
        await owner.saveBusiness({ name: 'Kape Kanto Two', tagline: 'Fresh from the roaster.' })
      },
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Kape Kanto Two' })).toBeInTheDocument()
    expect(screen.getByText('Fresh from the roaster.')).toBeInTheDocument()
  })

  it('has no note once the menu is live', async () => {
    await renderDashboardApp('/dashboard/preview', { published: true, plan: 'active' })
    await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })
    await waitFor(() => expect(screen.queryByText(text.note)).not.toBeInTheDocument())
    expect(screen.queryByText(text.notePaused)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: text.back })).toBeInTheDocument()
  })

  it('says the menu is paused when the trial ended, whether or not it was published', async () => {
    await renderDashboardApp('/dashboard/preview', { published: true, plan: 'ended' })
    await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })
    expect(await screen.findByText(text.notePaused)).toBeInTheDocument()
    expect(screen.queryByText(text.note)).not.toBeInTheDocument()
  })

  it('sends an owner without a business to the setup wizard', async () => {
    const { router } = await renderDashboardApp('/dashboard/preview', { business: false })
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
    expect(screen.queryByRole('heading', { level: 1, name: 'Kape Kanto' })).not.toBeInTheDocument()
  })

  it('is where "Open menu" on the Share page leads in demo mode, in the same tab', async () => {
    const { user, router } = await renderDashboardApp('/dashboard/share')
    await screen.findByRole('heading', { level: 1, name: share.title })
    await user.click(screen.getByRole('link', { name: share.link.open }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/preview')
    await user.click(screen.getByRole('link', { name: text.back }))
    expect(await screen.findByRole('heading', { level: 1, name: overview.title })).toBeInTheDocument()
  })

  it('is where "Open menu" on the Overview leads, for a live menu too', async () => {
    const { user, router } = await renderDashboardApp('/dashboard', { published: true, plan: 'active' })
    await screen.findByRole('heading', { level: 1, name: overview.title })
    await user.click(await screen.findByRole('link', { name: share.link.open }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Kape Kanto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/preview')
  })
})
