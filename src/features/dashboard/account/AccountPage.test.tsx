import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { createMockAuth } from '@/data/auth'
import type { Account } from '@/entities/account/account'
import { SessionProvider } from '@/shared/session/SessionProvider'
import { testOwner } from '@/test/auth'
import { NOW, renderDashboardPage } from '@/test/dashboard'
import { DashboardDataContext, type DashboardData } from '../dashboardData'
import { AccountPage } from './AccountPage'
import { ProfilePanel } from './ProfilePanel'

const page = <AccountPage />
const { account } = dashboardCopy
const menuPanel = () => screen.getByRole('heading', { name: 'Your menu page' }).closest('section') as HTMLElement
const open = (options: Parameters<typeof renderDashboardPage>[2] = {}) =>
  renderDashboardPage(page, '/dashboard/account', { guard: false, ...options })

describe('AccountPage', () => {
  it('shows a new owner on the free trial, with the plans and the free cards', async () => {
    await open()
    expect(await screen.findByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('Your free trial ends on Oct 26, 2026. Choose a plan to keep your menu live.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Choose your plan' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Annual/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Monthly/ })).toHaveAccessibleName(/₱479/)
    expect(screen.getByRole('heading', { name: '2 free NFC cards' })).toBeInTheDocument()
    expect(screen.getByText(/We send them for free when your plan starts/)).toBeInTheDocument()
    expect(within(menuPanel()).getByText('Draft')).toBeInTheDocument()
  })

  it('starts the plan the owner picks', async () => {
    const { user, billing } = await open()
    await user.click(await screen.findByRole('radio', { name: /Monthly/ }))
    await user.click(screen.getByRole('button', { name: 'Start monthly plan' }))
    expect(await screen.findByRole('heading', { name: 'Monthly plan is active' })).toBeInTheDocument()
    expect(screen.getByText('Renews on Nov 19, 2026.')).toBeInTheDocument()
    expect(screen.getByText(/We will call you to confirm where to send them/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start/ })).not.toBeInTheDocument()
    expect((await billing.current()).plan).toBe('month')
  })

  it('keeps the plan choice read-only while a plan is active', async () => {
    await open({ plan: 'active' })
    expect(await screen.findByRole('heading', { name: 'Monthly plan is active' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Monthly/ })).toBeDisabled()
    expect(screen.getByText('Your plan')).toBeInTheDocument()
    expect(screen.getByText(/Your free cards are next/)).toBeInTheDocument()
  })

  it('pauses the published menu once the trial is over', async () => {
    await open({ published: true, plan: 'ended' })
    expect(await screen.findByRole('heading', { name: 'Your free trial has ended' })).toBeInTheDocument()
    expect(screen.getByText('Your menu is paused, not deleted. Choose a plan to turn it back on.')).toBeInTheDocument()
    expect(within(menuPanel()).getByText('Paused')).toBeInTheDocument()
    expect(within(menuPanel()).getByText(account.menu.body.paused)).toBeInTheDocument()
  })

  it('tells the owner of a draft to choose a plan and then publish once the trial is over, never that it comes back', async () => {
    await open({ plan: 'ended' })
    expect(await screen.findByRole('heading', { name: 'Your free trial has ended' })).toBeInTheDocument()
    expect(screen.getByText(account.status.endedDraft)).toBeInTheDocument()
    expect(within(menuPanel()).getByText('Paused')).toBeInTheDocument()
    expect(within(menuPanel()).getByText(account.menu.body.pausedDraft)).toBeInTheDocument()
    expect(screen.queryByText(/paused, not deleted|turn it back on|until a plan is running/)).not.toBeInTheDocument()
  })

  it('says nothing about a paused menu to an owner with no menu once the trial is over', async () => {
    await open({ business: false, plan: 'ended' })
    expect(await screen.findByRole('heading', { name: 'Your free trial has ended' })).toBeInTheDocument()
    expect(screen.getByText(account.status.endedOther)).toBeInTheDocument()
    expect(within(menuPanel()).getByText('Not set up')).toBeInTheDocument()
    expect(screen.queryByText(/paused/i)).not.toBeInTheDocument()
  })

  it('says a menu nobody published is a draft, with a way to publish it, and never "Live"', async () => {
    await open()
    await screen.findByRole('heading', { name: 'Free trial: 7 days left' })
    const menu = within(menuPanel())
    expect(menu.getByText('Draft')).toBeInTheDocument()
    expect(menu.queryByText('Live')).not.toBeInTheDocument()
    expect(menu.getByRole('link', { name: 'Publish your menu' })).toHaveAttribute('href', '/dashboard/share')
    expect(screen.queryByText(/Your menu is live until/)).not.toBeInTheDocument()
  })

  it('says the menu is live, and until when, once it is published and the trial runs', async () => {
    await open({ published: true })
    await screen.findByRole('heading', { name: 'Free trial: 7 days left' })
    expect(within(menuPanel()).getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Your menu is live until Oct 26, 2026. Choose a plan to keep it on.')).toBeInTheDocument()
  })

  it('says a published menu is paused when the trial is over', async () => {
    await open({ published: true, plan: 'ended' })
    await screen.findByRole('heading', { name: 'Your free trial has ended' })
    expect(within(menuPanel()).getByText('Paused')).toBeInTheDocument()
  })

  it('says a published menu is live while a plan runs', async () => {
    await open({ published: true, plan: 'active' })
    await screen.findByRole('heading', { name: 'Monthly plan is active' })
    expect(within(menuPanel()).getByText('Live')).toBeInTheDocument()
  })

  it('announces the plan that was started and keeps the focus in the page', async () => {
    const { user } = await open()
    await user.click(await screen.findByRole('button', { name: 'Start annual plan' }))
    const title = await screen.findByRole('heading', { name: 'Annual plan is active' })
    expect(screen.getByText('Your annual plan is on.')).toHaveAttribute('role', 'status')
    expect(title).toHaveFocus()
  })

  it('leaves the focus alone when an owner who already has a plan opens the page', async () => {
    await open({ plan: 'active' })
    await screen.findByRole('heading', { name: 'Monthly plan is active' })
    expect(document.body).toHaveFocus()
  })

  it('says the free cards are next, not that the plan is on, when a paid plan has lapsed', async () => {
    await open({ plan: 'active', at: NOW + 40 * 86_400_000 })
    expect(await screen.findByRole('heading', { name: 'Your monthly plan has ended' })).toBeInTheDocument()
    const cards = screen.getByRole('heading', { name: '2 free NFC cards' }).closest('section') as HTMLElement
    expect(within(cards).getByText(/Your free cards are next/)).toBeInTheDocument()
    expect(screen.queryByText(/Your plan is on/)).not.toBeInTheDocument()
  })

  it('stays put and says so when the checkout cannot open', async () => {
    const { user, billing } = await open()
    // A checkout address that is not the payment provider's own must never be followed.
    vi.spyOn(billing, 'startCheckout').mockResolvedValue({ kind: 'redirect', url: 'https://evil.example/pay' })
    await user.click(await screen.findByRole('button', { name: 'Start annual plan' }))
    expect(await screen.findByText('Could not open the checkout. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start annual plan' })).toBeEnabled()
  })

  it('lets the owner pick and start a plan with the keyboard', async () => {
    const { user, billing } = await open()
    const annual = await screen.findByRole('radio', { name: /Annual/ })
    annual.focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: /Monthly/ })).toBeChecked()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Start monthly plan' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Monthly plan is active' })).toBeInTheDocument()
    expect((await billing.current()).plan).toBe('month')
  })

  it('shows who is signed in and how', async () => {
    await open()
    const profile = (await screen.findByRole('heading', { name: 'Profile' })).parentElement?.parentElement as HTMLElement
    expect(within(profile).getByText(testOwner.name)).toBeInTheDocument()
    expect(within(profile).getByText(testOwner.email)).toBeInTheDocument()
    expect(within(profile).getByText('Email and password')).toBeInTheDocument()
  })

  it('names Google as the way in for an owner who signed in with Google', () => {
    const account: Account = { id: 'a1', name: 'Demo Owner', email: 'owner@example.com', method: 'google' }
    render(<ProfilePanel account={account} onLogOut={() => undefined} />)
    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.queryByText('Email and password')).not.toBeInTheDocument()
  })

  it('logs the owner out and leaves for the home page', async () => {
    const { user, auth, router } = await open()
    await user.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(await screen.findByText('Went to /')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(await auth.current()).toBeNull()
  })

  it('works before the setup wizard, when the owner has no business yet', async () => {
    await open({ business: false })
    expect(await screen.findByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start annual plan' })).toBeInTheDocument()
  })

  it('tells an owner with no menu to set it up, and never says "Live"', async () => {
    await open({ business: false })
    await screen.findByRole('heading', { name: 'Free trial: 7 days left' })
    const menu = within(menuPanel())
    expect(menu.getByText('Not set up')).toBeInTheDocument()
    expect(menu.queryByText('Live')).not.toBeInTheDocument()
    expect(menu.getByRole('link', { name: 'Set up your menu' })).toHaveAttribute('href', '/dashboard/setup')
    expect(screen.queryByText(/Your menu is live until/)).not.toBeInTheDocument()
  })
})

describe('AccountPage while the business loads', () => {
  it('says nothing about the menu, never "Not set up", until the business is in', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await open({
      published: true,
      wrapOwner: (real) => ({
        ...real,
        getBusiness: async () => {
          await gate
          return real.getBusiness()
        },
      }),
    })
    // The plan does not wait for the business: it is there, and the menu panel is not.
    expect(await screen.findByRole('heading', { name: 'Free trial: 7 days left' })).toBeInTheDocument()
    expect(screen.queryByText('Not set up')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Set up your menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your menu page' })).not.toBeInTheDocument()

    release()
    await screen.findByRole('heading', { name: 'Your menu page' })
    expect(within(menuPanel()).getByText('Live')).toBeInTheDocument()
  })
})

describe('AccountPage while the account loads', () => {
  async function renderWith(resource: { status: 'loading' } | { status: 'error' }, retry = vi.fn()) {
    const auth = createMockAuth({ delay: 0 })
    await auth.signUp(testOwner)
    // Only what the page reads is filled in; the rest of the shared data is not its business.
    const value = { account: { resource, retry, starting: null, failed: false }, access: null, now: 0 } as unknown as DashboardData
    render(
      <SessionProvider repository={auth}>
        <MemoryRouter>
          <DashboardDataContext.Provider value={value}>{page}</DashboardDataContext.Provider>
        </MemoryRouter>
      </SessionProvider>,
    )
    return { retry, user: userEvent.setup() }
  }

  it('says it is loading and still shows the profile', async () => {
    await renderWith({ status: 'loading' })
    expect(await screen.findByRole('status')).toHaveTextContent(dashboardCopy.account.loading)
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose your plan' })).not.toBeInTheDocument()
  })

  it('says the plan could not load and retries when asked', async () => {
    const { user, retry } = await renderWith({ status: 'error' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your account.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })
})
