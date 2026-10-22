import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Subscription } from '@/entities/account/subscription'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { SharePage } from './SharePage'

// The plan comes from billing. A test can make that call fail, or hold it until the test lets it go.
const plan = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'fail' | 'hold', release: () => {} }))
vi.mock('@/data/billing', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/billing')>()
  return {
    ...real,
    createMockBilling: (...args: Parameters<typeof real.createMockBilling>) => {
      const billing = real.createMockBilling(...args)
      return {
        ...billing,
        current: async (): Promise<Subscription> => {
          if (plan.mode === 'fail') throw new real.BillingError('down')
          if (plan.mode === 'hold') await new Promise<void>((resolve) => (plan.release = resolve))
          return billing.current()
        },
      }
    },
  }
})

const text = dashboardCopy.share
const render = (options: DashboardOptions = {}) => renderDashboardPage(<SharePage />, '/dashboard/share', options)
const publishSwitch = () => screen.getByRole('switch', { name: text.publish.label })
const notes = [text.link.notLive, text.link.paused, text.link.pausedDraft]
const claims = [text.publish.draft, text.publish.live, text.publish.paused, text.publish.endedDraft]

beforeEach(() => {
  plan.mode = 'ok'
})

describe('Share, the switch and the link note agree', () => {
  const cases: { name: string; options: DashboardOptions; description: string; note: string | null }[] = [
    { name: 'a draft while the plan runs', options: {}, description: text.publish.draft, note: text.link.notLive },
    { name: 'a published menu while the plan runs', options: { published: true }, description: text.publish.live, note: null },
    { name: 'a published menu after the plan ended', options: { published: true, plan: 'ended' }, description: text.publish.paused, note: text.link.paused },
    { name: 'a draft after the plan ended', options: { plan: 'ended' }, description: text.publish.endedDraft, note: text.link.pausedDraft },
  ]

  it.each(cases)('says the same thing about $name', async ({ options, description, note }) => {
    await render(options)
    expect(await screen.findByText(description)).toBeInTheDocument()
    // Exactly one claim about the menu, and only the note that fits the state.
    expect(claims.filter((claim) => screen.queryByText(claim) !== null)).toEqual([description])
    expect(notes.filter((candidate) => screen.queryByText(candidate) !== null)).toEqual(note === null ? [] : [note])
    expect(publishSwitch()).toHaveAttribute('aria-checked', String(options.published === true))
  })
})

describe('Share, while the plan is not known', () => {
  it('says nothing about the menu while the plan loads, and fills in when it arrives', async () => {
    plan.mode = 'hold'
    await render({ published: true })
    expect(publishSwitch()).toBeEnabled()
    expect(claims.filter((claim) => screen.queryByText(claim) !== null)).toEqual([])
    expect(notes.filter((candidate) => screen.queryByText(candidate) !== null)).toEqual([])

    plan.release()
    expect(await screen.findByText(text.publish.live)).toBeInTheDocument()
  })

  it('says the plan could not load, makes no claim, and loads it again on Retry', async () => {
    plan.mode = 'fail'
    const { user } = await render({ published: true })
    expect(await screen.findByRole('alert')).toHaveTextContent(dashboardCopy.overview.planError)
    expect(claims.filter((claim) => screen.queryByText(claim) !== null)).toEqual([])
    expect(notes.filter((candidate) => screen.queryByText(candidate) !== null)).toEqual([])
    expect(publishSwitch()).toHaveAttribute('aria-checked', 'true')

    plan.mode = 'ok'
    await user.click(screen.getByRole('button', { name: dashboardCopy.shell.retry }))
    expect(await screen.findByText(text.publish.live)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
