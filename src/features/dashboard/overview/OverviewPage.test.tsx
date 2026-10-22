import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import { env } from '@/config/env'
import type { OwnerRepository } from '@/data/ownerRepository'
import { OwnerError } from '@/data/ownerRepository'
import { NOW, renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { sampleImageFile } from '@/test/ownerFixtures'
import { OverviewPage } from './OverviewPage'

const text = dashboardCopy.overview
const linkText = dashboardCopy.share.link

function open(options: DashboardOptions = {}) {
  return renderDashboardPage(<OverviewPage />, '/dashboard', options)
}

/** The status panel is the one whose heading says what state the menu is in. */
async function panel(name: string | RegExp) {
  const section = (await screen.findByRole('heading', { level: 2, name })).closest('section')
  if (!section) throw new Error(`no panel called ${String(name)}`)
  return within(section)
}

describe('OverviewPage, the status of the menu', () => {
  it('has one page title and says a menu that is not published is a draft, with a way to the Share page', async () => {
    await open()
    expect(screen.getByRole('heading', { level: 1, name: text.title })).toBeInTheDocument()
    const status = await panel(text.status.draft.title)
    expect(status.getByRole('link', { name: text.status.draft.action })).toHaveAttribute('href', '/dashboard/share')
    expect(status.queryByRole('button', { name: linkText.copy })).not.toBeInTheDocument()
  })

  it('shows the link of a live menu with Copy, and an Open that leads to the preview in demo mode', async () => {
    await open({ published: true })
    const status = await panel(text.status.live.title)
    const link = `${window.location.origin}/m/kape-kanto`
    expect(status.getByText(link)).toBeInTheDocument()
    const openLink = screen.getByRole('link', { name: new RegExp(linkText.open) })
    expect(openLink).toHaveAttribute('href', '/dashboard/preview')
    expect(openLink).not.toHaveAttribute('target')
  })

  it('copies the link and says so', async () => {
    const { user } = await open({ published: true })
    await user.click(await screen.findByRole('button', { name: linkText.copy }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/m/kape-kanto`)
    expect(await screen.findByText(linkText.copied)).toBeInTheDocument()
  })

  it('says it could not copy when the browser refuses, and keeps the link on screen', async () => {
    const { user } = await open({ published: true })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
    await user.click(await screen.findByRole('button', { name: linkText.copy }))
    expect(await screen.findByText(linkText.copyFailed)).toBeInTheDocument()
    expect(screen.getByText(`${window.location.origin}/m/kape-kanto`)).toBeInTheDocument()
  })

  it('says a published menu is paused, not deleted, when the trial has ended, with a way to the Account page', async () => {
    await open({ published: true, plan: 'ended' })
    const status = await panel(text.status.paused.title)
    expect(screen.getByText(text.status.paused.body)).toBeInTheDocument()
    expect(status.getByRole('link', { name: text.status.paused.action })).toHaveAttribute('href', '/dashboard/account')
    expect(status.queryByRole('button', { name: linkText.copy })).not.toBeInTheDocument()
  })

  it('does not say "turn it back on" about a menu nobody published when the trial has ended', async () => {
    await open({ plan: 'ended' })
    const status = await panel(text.status.paused.title)
    expect(screen.getByText(text.status.paused.bodyDraft)).toBeInTheDocument()
    expect(screen.queryByText(text.status.paused.body)).not.toBeInTheDocument()
    expect(status.getByRole('link', { name: text.status.paused.action })).toHaveAttribute('href', '/dashboard/account')
  })
})

describe('OverviewPage, the menu link with a configured public address', () => {
  const original = env.publicOrigin
  afterEach(() => {
    Object.assign(env, { publicOrigin: original })
  })

  it('shows and copies the link built from the configured address, not the address bar', async () => {
    Object.assign(env, { publicOrigin: 'https://menu.example.com' })
    const { user } = await open({ published: true })
    const link = 'https://menu.example.com/m/kape-kanto'
    await panel(text.status.live.title)
    expect(screen.getByText(link)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: linkText.copy }))
    expect(await navigator.clipboard.readText()).toBe(link)
  })
})

describe('OverviewPage, the setup checklist', () => {
  it('counts the steps done and links each step to its page', async () => {
    await open()
    const list = await panel(text.checklist.title)
    const bar = await screen.findByRole('progressbar', { name: text.checklist.progress })
    // The sample menu has items and the contact details are filled in; there is no logo, it is not published, no plan.
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '5')
    expect(bar).toHaveAttribute('aria-valuetext', '2 of 5 steps done')

    const steps = text.checklist.steps
    const expected: [string, string, string][] = [
      [steps.items, '/dashboard/menu', text.checklist.done],
      [steps.details, '/dashboard/design', text.checklist.done],
      [steps.logo, '/dashboard/design', text.checklist.todo],
      [steps.publish, '/dashboard/share', text.checklist.todo],
      [steps.plan, '/dashboard/account', text.checklist.todo],
    ]
    for (const [label, href, state] of expected) {
      const link = list.getByRole('link', { name: `${label} ${state}` })
      expect(link).toHaveAttribute('href', href)
    }
    expect(list.queryByText(text.checklist.allDone)).not.toBeInTheDocument()
  })

  it('has no steps done for an owner with no items and no details', async () => {
    await open({ menu: 'preset', details: false })
    const bar = await screen.findByRole('progressbar', { name: text.checklist.progress })
    expect(bar).toHaveAttribute('aria-valuenow', '0')
  })

  it('says everything is done when all five steps are', async () => {
    await open({
      published: true,
      plan: 'active',
      seed: async (owner) => {
        await owner.saveBusiness({ logo: await owner.uploadImage(sampleImageFile('png')) })
      },
    })
    const bar = await screen.findByRole('progressbar', { name: text.checklist.progress })
    expect(bar).toHaveAttribute('aria-valuenow', '5')
    expect(screen.getByText(text.checklist.allDone)).toBeInTheDocument()
  })
})

describe('OverviewPage, the plan and the free cards', () => {
  it('shows the days left of the trial and a way to choose a plan', async () => {
    await open()
    const plan = await panel(text.plan.title)
    expect(await plan.findByText(/^Free trial: \d+ days? left$/)).toBeInTheDocument()
    expect(plan.getByRole('link', { name: text.plan.start })).toHaveAttribute('href', '/dashboard/account')
    expect((await panel(text.freeCards.title.many.replace('{n}', '2'))).getByText(text.freeCards.waiting)).toBeInTheDocument()
  })

  it('shows the active plan and when it renews, and says the free cards are next', async () => {
    await open({ plan: 'active' })
    const plan = await panel(text.plan.title)
    expect(await plan.findByText(text.plan.active.replace('{plan}', text.plan.names.month))).toBeInTheDocument()
    expect(plan.getByText(/^Renews on /)).toBeInTheDocument()
    expect(plan.getByRole('link', { name: text.plan.manage })).toHaveAttribute('href', '/dashboard/account')
    expect((await panel(text.freeCards.title.many.replace('{n}', '2'))).getByText(text.freeCards.ready)).toBeInTheDocument()
  })

  it('says the free cards are next, not that the plan is on, when a paid plan has lapsed', async () => {
    await open({ plan: 'active', at: NOW + 40 * 86_400_000 })
    const cards = await panel(text.freeCards.title.many.replace('{n}', '2'))
    expect(cards.getByText(text.freeCards.ready)).toBeInTheDocument()
    expect(text.freeCards.ready).not.toMatch(/plan is on/i)
  })

  it('says the trial ended and the published menu is paused', async () => {
    await open({ published: true, plan: 'ended' })
    const plan = await panel(text.plan.title)
    expect(await plan.findByText(text.plan.trialEnded)).toBeInTheDocument()
    expect(plan.getByText(text.plan.trialEndedBody)).toBeInTheDocument()
  })

  it('tells the owner of a draft to choose a plan and then publish when the trial ended, never to "turn it back on"', async () => {
    await open({ plan: 'ended' })
    const plan = await panel(text.plan.title)
    expect(await plan.findByText(text.plan.trialEnded)).toBeInTheDocument()
    expect(plan.getByText(text.plan.endedDraftBody)).toBeInTheDocument()
    expect(screen.queryByText(/turn it back on/)).not.toBeInTheDocument()
  })
})

describe('OverviewPage, the visitors', () => {
  it('shows the views and taps of the 14 days, the top items and a Sample data mark', async () => {
    const { owner } = await open()
    const insights = await owner.insights()
    const views = insights.days.reduce((sum, day) => sum + day.views, 0)
    const taps = insights.days.reduce((sum, day) => sum + day.taps, 0)

    const visitors = await panel(text.visitors.title)
    expect(await visitors.findByText(text.visitors.demo)).toBeInTheDocument()
    expect(visitors.getByText(String(views))).toBeInTheDocument()
    expect(visitors.getByText(String(taps))).toBeInTheDocument()
    expect(visitors.getByRole('heading', { level: 3, name: text.visitors.views })).toBeInTheDocument()
    expect(visitors.getByRole('heading', { level: 3, name: text.visitors.taps })).toBeInTheDocument()

    const top = within(visitors.getByRole('heading', { level: 3, name: text.visitors.top }).parentElement!).getAllByRole('listitem')
    expect(top).toHaveLength(insights.topItems.length)
    for (const item of insights.topItems) expect(visitors.getByText(item.name)).toBeInTheDocument()
    // The plot has its numbers as a table for screen readers.
    expect(visitors.getByRole('table', { name: text.visitors.daily })).toBeInTheDocument()
  })

  it('shows a loading note while the numbers are on their way', async () => {
    const gate: { release?: () => void } = {}
    await open({
      wrapOwner: (real): OwnerRepository => ({
        ...real,
        insights: () =>
          new Promise((resolve) => {
            gate.release = () => void real.insights().then(resolve)
          }),
      }),
    })
    expect(screen.getByText(text.visitors.loading)).toBeInTheDocument()
    expect(screen.queryByText(text.visitors.demo)).not.toBeInTheDocument()
    // The page asks for the numbers once its effect has run, which can be a moment after the first render.
    await waitFor(() => expect(gate.release).toBeDefined())
    gate.release?.()
    expect(await screen.findByText(text.visitors.demo)).toBeInTheDocument()
    expect(screen.queryByText(text.visitors.loading)).not.toBeInTheDocument()
  })

  it('says it could not load the numbers, in words, and tries again on Retry', async () => {
    let fail = true
    const { user } = await open({
      wrapOwner: (real): OwnerRepository => ({
        ...real,
        insights: () => (fail ? Promise.reject(new OwnerError('network')) : real.insights()),
      }),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(text.visitors.error)
    expect(screen.queryByText('network')).not.toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: dashboardCopy.shell.retry }))
    expect(await screen.findByText(text.visitors.demo)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('asks for items instead of showing numbers when the menu has none, and does not ask for the numbers', async () => {
    const insights = vi.fn()
    await open({
      menu: 'preset',
      wrapOwner: (real): OwnerRepository => ({ ...real, insights: (...args) => (insights(), real.insights(...args)) }),
    })
    expect((await panel(text.visitors.title)).getByText(text.visitors.empty)).toBeInTheDocument()
    expect(screen.queryByText(text.visitors.demo)).not.toBeInTheDocument()
    expect(insights).not.toHaveBeenCalled()
  })
})

describe('OverviewPage, the quick actions', () => {
  it('links to adding an item, the look and sharing', async () => {
    await open()
    const quick = await panel(text.quick.title)
    expect(quick.getByRole('link', { name: text.quick.addItem })).toHaveAttribute('href', '/dashboard/menu')
    expect(quick.getByRole('link', { name: text.quick.look })).toHaveAttribute('href', '/dashboard/design')
    expect(quick.getByRole('link', { name: text.quick.share })).toHaveAttribute('href', '/dashboard/share')
  })

  it('goes to the page of a link when it is followed', async () => {
    const { user, router } = await open()
    await user.click(screen.getByRole('link', { name: text.quick.share }))
    expect(router.state.location.pathname).toBe('/dashboard/share')
  })
})
