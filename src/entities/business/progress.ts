import type { Access } from '@/entities/account/subscription'
import type { Menu } from '@/entities/menu/menu'
import type { Business } from './business'

/** The setup checklist on the Overview, in the order the owner meets the steps. */
export const SETUP_STEPS = ['items', 'details', 'logo', 'publish', 'plan'] as const
export type SetupStepId = (typeof SETUP_STEPS)[number]
export type SetupStep = { id: SetupStepId; done: boolean }

export function setupSteps({ business, menu, access }: { business: Business; menu: Menu; access: Access }): SetupStep[] {
  const done: Record<SetupStepId, boolean> = {
    items: menu.products.length > 0,
    details: [business.phone, business.address, business.hours].some((text) => text.trim() !== ''),
    logo: business.logo !== null && business.logo !== '',
    publish: business.published,
    plan: access.kind === 'active',
  }
  return SETUP_STEPS.map((id) => ({ id, done: done[id] }))
}

export function setupProgress(steps: readonly SetupStep[]): { done: number; total: number } {
  return { done: steps.filter((step) => step.done).length, total: steps.length }
}
