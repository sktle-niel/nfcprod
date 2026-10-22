import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import type { BusinessPatch } from '@/entities/business/business'
import type { OwnerRepository } from '@/data/ownerRepository'
import { renderDashboardPage, type DashboardOptions } from '@/test/dashboard'
import { DesignPage } from './DesignPage'

/** Test helpers of the Design page's tests. */

export type SaveSpy = { patches: BusinessPatch[]; wrap: (real: OwnerRepository) => OwnerRepository }

/** Records every patch sent to `saveBusiness`, then lets the real repository handle it. */
export function spyOnSave(): SaveSpy {
  const patches: BusinessPatch[] = []
  return {
    patches,
    wrap: (real) => ({
      ...real,
      saveBusiness: (patch) => {
        patches.push(patch)
        return real.saveBusiness(patch)
      },
    }),
  }
}

/** Starts the test from a business that already has `patch` saved. */
export const seedBusiness = (patch: BusinessPatch) => async (owner: OwnerRepository) => {
  await owner.saveBusiness(patch)
}

export function renderDesign(options: DashboardOptions = {}) {
  return renderDashboardPage(<DesignPage />, '/dashboard/design', options)
}

/** The preview window onto the menu. */
export const previewRegion = () => screen.getByRole('region', { name: 'Menu preview' })

/** Shows one part of the Look tab: Colors, Cards, Headings or Extras. */
export async function showPart(user: UserEvent, name: 'Colors' | 'Cards' | 'Headings' | 'Extras') {
  await user.click(within(screen.getByRole('group', { name: 'Part of the look to change' })).getByRole('button', { name }))
}

export const saveButton = () => screen.getByRole('button', { name: 'Save changes' })
export const discardButton = () => screen.getByRole('button', { name: 'Discard changes' })
