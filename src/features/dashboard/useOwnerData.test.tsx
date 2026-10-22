import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OwnerError, type OwnerRepository } from '@/data/ownerRepository'
import { NOW, renderDashboardPage } from '@/test/dashboard'
import { useDashboardData } from './dashboardData'

/** Shows what the shared data holds, and lets a test call its actions. */
function Probe() {
  const data = useDashboardData()
  return (
    <div>
      <p data-testid="business">{data.business?.name ?? 'none'}</p>
      <p data-testid="published">{String(data.business?.published ?? false)}</p>
      <p data-testid="categories">{data.menu.categories.map((category) => category.name).join(', ')}</p>
      <p data-testid="access">{data.access?.kind ?? 'unknown'}</p>
      <p data-testid="days">{data.access?.kind === 'trial' ? data.access.daysLeft : ''}</p>
      <p data-testid="live">{String(data.live)}</p>
      <button type="button" onClick={() => data.actions.saveCategory({ name: 'Brunch', visible: true }).catch(() => {})}>
        add category
      </button>
      <button type="button" onClick={() => void data.actions.setPublished(true)}>
        publish
      </button>
      <button type="button" onClick={() => void data.actions.saveBusiness({ name: 'Kape Kanto Two' })}>
        rename
      </button>
    </div>
  )
}

const probe = (options = {}) => renderDashboardPage(<Probe />, '/dashboard/probe', options)

describe('the owner data every dashboard page shares', () => {
  it('loads the business, the menu and where the plan stands', async () => {
    await probe()
    expect(screen.getByTestId('business')).toHaveTextContent('Kape Kanto')
    expect(screen.getByTestId('categories')).toHaveTextContent('Hot, Iced')
    expect(await screen.findByText('trial', { selector: '[data-testid="access"]' })).toBeInTheDocument()
  })

  it('puts a changed menu in place for every page, as the repository sent it back', async () => {
    const { user, owner } = await probe()
    await user.click(screen.getByRole('button', { name: 'add category' }))
    expect(await screen.findByText('Hot, Iced, Brunch')).toBeInTheDocument()
    expect((await owner.getMenu()).categories.map((category) => category.name)).toEqual(['Hot', 'Iced', 'Brunch'])
  })

  it('puts a changed business in place, and leaves the menu alone', async () => {
    const { user } = await probe()
    await user.click(screen.getByRole('button', { name: 'rename' }))
    expect(await screen.findByText('Kape Kanto Two')).toBeInTheDocument()
    expect(screen.getByTestId('categories')).toHaveTextContent('Hot, Iced')
  })

  it('counts the menu as live only when it is published and the trial or plan is running', async () => {
    const { user } = await probe()
    expect(await screen.findByText('trial')).toBeInTheDocument()
    expect(screen.getByTestId('live')).toHaveTextContent('false')

    await user.click(screen.getByRole('button', { name: 'publish' }))
    expect(await screen.findByText('true', { selector: '[data-testid="live"]' })).toBeInTheDocument()
  })

  it('keeps a published menu paused once the trial is over', async () => {
    await probe({ published: true, plan: 'ended' })
    expect(await screen.findByText('trialEnded')).toBeInTheDocument()
    expect(screen.getByTestId('published')).toHaveTextContent('true')
    expect(screen.getByTestId('live')).toHaveTextContent('false')
  })

  it('lets a refusal reach the page that asked, and changes nothing', async () => {
    const refusing = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      saveCategory: () => Promise.reject(new OwnerError('network')),
    })
    const { user } = await probe({ wrapOwner: refusing })
    await user.click(screen.getByRole('button', { name: 'add category' }))
    expect(screen.getByTestId('categories')).toHaveTextContent('Hot, Iced')
    expect(screen.getByTestId('categories')).not.toHaveTextContent('Brunch')
  })

  it('counts a trial that started seconds ago as seven days, not eight', async () => {
    // The clock the dashboard reads is rounded to the minute; rounded down it would read before the trial began.
    await probe({ startedAt: NOW + 30_000, at: NOW + 40_000 })
    expect(await screen.findByText('7', { selector: '[data-testid="days"]' })).toBeInTheDocument()
  })

  it('signs the owner out when the repository says the session ended, and still lets the page see the refusal', async () => {
    const ended = (real: OwnerRepository): OwnerRepository => ({
      ...real,
      saveCategory: () => Promise.reject(new OwnerError('signedOut')),
    })
    const { user, auth } = await probe({ wrapOwner: ended })
    expect(await auth.current()).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'add category' }))
    await waitFor(async () => expect(await auth.current()).toBeNull())
  })

  it('shows an owner without a business as having none', async () => {
    await renderDashboardPage(<Probe />, '/dashboard/probe', { business: false, guard: false })
    expect(await screen.findByText('none')).toBeInTheDocument()
    expect(screen.getByTestId('categories')).toBeEmptyDOMElement()
  })
})
