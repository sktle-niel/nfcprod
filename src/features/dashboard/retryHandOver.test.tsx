import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Subscription } from '@/entities/account/subscription'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardApp, renderDashboardPage } from '@/test/dashboard'
import { AccountPage } from './account/AccountPage'
import { OverviewPage } from './overview/OverviewPage'
import { SharePage } from './share/SharePage'

/*
 * Retry takes its error note away, and the button with it. The focus must not fall to the body: it goes to something that
 * stays (the page title, the panel title, or the busy Retry of the whole-dashboard failure), an always-mounted status line
 * says that it loads, and a second failure is said again.
 */

// The plan comes from billing: a test can make it fail, or hold it until the test lets it go.
const plan = vi.hoisted(() => ({ fail: false, hold: false, release: () => {} }))
vi.mock('@/data/billing', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/billing')>()
  return {
    ...real,
    createMockBilling: (...args: Parameters<typeof real.createMockBilling>) => {
      const billing = real.createMockBilling(...args)
      return {
        ...billing,
        current: async (): Promise<Subscription> => {
          if (plan.hold) await new Promise<void>((resolve) => (plan.release = resolve))
          if (plan.fail) throw new real.BillingError('down')
          return billing.current()
        },
      }
    },
  }
})

beforeEach(() => {
  Object.assign(plan, { fail: false, hold: false, release: () => {} })
})

const { shell, overview, share, account } = dashboardCopy
const retryButton = () => screen.getByRole('button', { name: shell.retry })

function statusSaying(words: string): HTMLElement {
  const line = screen.getAllByRole('status').find((candidate) => candidate.textContent === words)
  if (!line) throw new Error(`No status line says "${words}"`)
  return line
}

/** Presses Retry with the keyboard, as the owner who meets the error would. */
async function pressRetry(user: UserEvent) {
  retryButton().focus()
  await user.keyboard('{Enter}')
}

/** The answer is held, Retry is pressed, the focus and the status line are checked, and the answer fails again. */
async function retryThatFailsAgain(user: UserEvent, { title, loading, error }: { title: HTMLElement; loading: string; error: string }) {
  const lines = screen.getAllByRole('status')
  plan.hold = true
  await pressRetry(user)

  expect(title).toHaveFocus()
  const line = statusSaying(loading)
  // The line was there, empty, before Retry: a screen reader knows it and reads the words that come into it.
  expect(lines).toContain(line)

  plan.release()
  expect(await screen.findByRole('alert')).toHaveTextContent(error)
  expect(line).toBeEmptyDOMElement()
}

describe('Retry of the plan on a page', () => {
  it('hands the focus to the Overview title, says the plan is loading, and says it again when it fails again', async () => {
    plan.fail = true
    const { user } = await renderDashboardPage(<OverviewPage />, '/dashboard')
    expect(await screen.findByRole('alert')).toHaveTextContent(overview.planError)
    const title = screen.getByRole('heading', { level: 1, name: overview.title })

    await retryThatFailsAgain(user, { title, loading: overview.planLoading, error: overview.planError })

    plan.hold = false
    plan.fail = false
    await pressRetry(user)
    expect(title).toHaveFocus()
    expect(await screen.findByRole('heading', { level: 2, name: overview.plan.title })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('hands the focus to the Share title and says the plan is loading', async () => {
    plan.fail = true
    const { user } = await renderDashboardPage(<SharePage />, '/dashboard/share')
    expect(await screen.findByRole('alert')).toHaveTextContent(overview.planError)
    const title = screen.getByRole('heading', { level: 1, name: share.title })

    await retryThatFailsAgain(user, { title, loading: overview.planLoading, error: overview.planError })
  })

  it('hands the focus to the Account title and says the account is loading', async () => {
    plan.fail = true
    const { user } = await renderDashboardPage(<AccountPage />, '/dashboard/account', { guard: false })
    expect(await screen.findByRole('alert')).toHaveTextContent(account.loadError)
    const title = screen.getByRole('heading', { level: 1, name: account.title })

    await retryThatFailsAgain(user, { title, loading: account.loading, error: account.loadError })
  })
})

describe('Retry of the visitor numbers', () => {
  it('hands the focus to the Visitors title, not the page title, says they load, and says it again when they fail again', async () => {
    const gate = { fail: true, hold: false, release: () => {} }
    const { user } = await renderDashboardPage(<OverviewPage />, '/dashboard', {
      wrapOwner: (real): OwnerRepository => ({
        ...real,
        insights: async () => {
          if (gate.hold) await new Promise<void>((resolve) => (gate.release = resolve))
          if (gate.fail) throw new OwnerError('network')
          return real.insights()
        },
      }),
    })
    const text = overview.visitors
    expect(await screen.findByRole('alert')).toHaveTextContent(text.error)
    const title = screen.getByRole('heading', { level: 2, name: text.title })
    const lines = screen.getAllByRole('status')

    gate.hold = true
    await pressRetry(user)
    expect(title).toHaveFocus()
    expect(lines).toContain(statusSaying(text.loading))

    gate.release()
    expect(await screen.findByRole('alert')).toHaveTextContent(text.error)
  })
})

describe('Retry of the whole dashboard', () => {
  /** getBusiness fails while `gate.fail`, and waits while `gate.hold`. */
  function failingBusiness() {
    const gate = { fail: true, hold: false, release: () => {} }
    const wrapOwner = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      getBusiness: async () => {
        if (gate.hold) await new Promise<void>((resolve) => (gate.release = resolve))
        if (gate.fail) throw new OwnerError('network')
        return real.getBusiness()
      },
    })
    return { gate, wrapOwner }
  }

  it('has a title, Retry and Log out, keeps Retry focused and busy while it loads, and gives the focus to the page title after', async () => {
    const { gate, wrapOwner } = failingBusiness()
    const { user } = await renderDashboardApp('/dashboard', { wrapOwner })
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('heading', { level: 1, name: shell.failedTitle })).toBeInTheDocument()
    expect(main.getByRole('alert')).toHaveTextContent(shell.loadError)
    expect(main.getByRole('button', { name: shell.signedIn.logOut })).toBeInTheDocument()
    const line = main.getByRole('status')
    expect(line).toBeEmptyDOMElement()

    gate.hold = true
    await pressRetry(user)
    expect(retryButton()).toHaveFocus()
    expect(retryButton()).toHaveAttribute('aria-busy', 'true')
    expect(retryButton()).toHaveAttribute('aria-disabled', 'true')
    expect(line).toHaveTextContent(shell.loading)
    expect(main.getByRole('alert')).not.toHaveTextContent(shell.loadError)

    // It fails again: the same Retry keeps the focus and the alert says so again.
    gate.release()
    await waitFor(() => expect(main.getByRole('alert')).toHaveTextContent(shell.loadError))
    expect(retryButton()).toHaveFocus()
    expect(retryButton()).not.toHaveAttribute('aria-busy')
    expect(line).toBeEmptyDOMElement()

    gate.hold = false
    gate.fail = false
    await pressRetry(user)
    const title = await screen.findByRole('heading', { level: 1, name: overview.title })
    await waitFor(() => expect(title).toHaveFocus())
  })

  it('lets the owner log out from the failure, on any dashboard page, Account too', async () => {
    const { wrapOwner } = failingBusiness()
    const { user, auth } = await renderDashboardApp('/dashboard/account', { wrapOwner })
    await user.click(await screen.findByRole('button', { name: shell.signedIn.logOut }))
    expect(await screen.findByText('Went to /')).toBeInTheDocument()
    await waitFor(async () => expect(await auth.current()).toBeNull())
  })
})
