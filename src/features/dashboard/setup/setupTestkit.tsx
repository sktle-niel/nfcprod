import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage, type DashboardHarness, type DashboardOptions } from '@/test/dashboard'
import { SetupPage } from './SetupPage'

/** Helpers of the setup wizard's tests: the words, a way in, and the clicks every test repeats. */
export const text = dashboardCopy.setup

/** Mounts the wizard for an owner without a business, where the router puts it. */
export function openSetup(options: DashboardOptions = {}) {
  return renderDashboardPage(<SetupPage />, '/dashboard/setup', { business: false, guard: false, ...options })
}

/** The harness has no page at /dashboard itself, so the route is what shows where the wizard sent the owner. */
export const wentToDashboard = (router: DashboardHarness['router']) =>
  waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))

export const next = () => screen.getByRole('button', { name: text.next })
export const heading = (words: string) => screen.getByRole('heading', { name: words })
export const nameField = () => screen.getByLabelText(text.steps.name.label)
export const linkField = () => screen.getByLabelText(text.steps.link.label)
export const typeBox = (type: keyof typeof text.types) => screen.getByRole('checkbox', { name: text.types[type].label })

export async function fillName(user: UserEvent, name: string) {
  await user.clear(nameField())
  await user.type(nameField(), name)
}

/** Name, then types, then stops on the link step with the suggested link. */
export async function toLinkStep(user: UserEvent, name = 'Kape Kanto', types: (keyof typeof text.types)[] = ['coffee']) {
  await fillName(user, name)
  await user.click(next())
  for (const type of types) await user.click(typeBox(type))
  await user.click(next())
}

/** Waits for the link to be free, then moves to the review. */
export async function toReview(user: UserEvent) {
  await screen.findByText(text.steps.link.status.available)
  await user.click(next())
}

/** A repository that fails `createBusiness` with `failure` the first `times` calls, then does what the real one does. */
export function failingCreate(failure: unknown, times = 1) {
  let left = times
  return (real: OwnerRepository): OwnerRepository => ({
    ...real,
    createBusiness: async (input) => {
      if (left-- > 0) throw failure
      return real.createBusiness(input)
    },
  })
}
