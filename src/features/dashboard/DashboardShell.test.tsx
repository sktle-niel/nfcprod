import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { renderDashboardApp } from '@/test/dashboard'
import { testOwner } from '@/test/auth'

const text = dashboardCopy.shell

describe('the dashboard shell', () => {
  it('has a sidebar with the five pages, and marks the one the owner is on', async () => {
    await renderDashboardApp('/dashboard/design')

    const nav = screen.getByRole('navigation', { name: text.menu })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      text.nav.overview,
      text.nav.menu,
      text.nav.design,
      text.nav.share,
      text.nav.account,
    ])
    expect(within(nav).getByRole('link', { name: text.nav.design })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: text.nav.overview })).not.toHaveAttribute('aria-current')
  })

  it('marks Overview only on the home page of the dashboard, not on every page below it', async () => {
    await renderDashboardApp('/dashboard/share')
    const nav = screen.getByRole('navigation', { name: text.menu })
    expect(within(nav).getByRole('link', { name: text.nav.overview })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: text.nav.share })).toHaveAttribute('aria-current', 'page')
  })

  it('offers a skip link to the main content and says the data is demo data', async () => {
    await renderDashboardApp('/dashboard/design')
    expect(screen.getByRole('link', { name: text.skip })).toHaveAttribute('href', '#dashboard-main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'dashboard-main')
    expect(screen.getByText(text.demo)).toBeInTheDocument()
  })

  it('shows who is signed in, and logs out to the home page', async () => {
    const { user, auth, router } = await renderDashboardApp('/dashboard/design')

    const who = screen.getByRole('group', { name: text.signedIn.label })
    expect(within(who).getByText(testOwner.name)).toBeInTheDocument()
    expect(within(who).getByText(testOwner.email)).toBeInTheDocument()

    await user.click(within(who).getByRole('button', { name: text.signedIn.logOut }))
    expect(router.state.location.pathname).toBe('/')
    expect(await auth.current()).toBeNull()
  })

  it('keeps the sidebar around a page that does not exist', async () => {
    await renderDashboardApp('/dashboard/nope')
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: text.menu })).toBeInTheDocument()
  })
})

describe('the owner who has not been through the setup wizard', () => {
  it.each(['/dashboard', '/dashboard/menu', '/dashboard/design', '/dashboard/share'])('is sent to the wizard from %s', async (path) => {
    const { router } = await renderDashboardApp(path, { business: false })
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/setup'))
  })

  it('can still reach the account page, where the plan is', async () => {
    const { router } = await renderDashboardApp('/dashboard/account', { business: false })
    expect(router.state.location.pathname).toBe('/dashboard/account')
  })
})
