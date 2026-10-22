import { createContext, useContext } from 'react'
import type { Insights } from '@/data/ownerRepository'
import type { Access } from '@/entities/account/subscription'
import type { Business, BusinessPatch, NewBusinessInput, SlugStatus } from '@/entities/business/business'
import type { CategoryInput, GroupInput, Menu, ProductInput } from '@/entities/menu/menu'
import type { useAccount } from './useAccount'

/** The owner's plan, prices and the way to start a plan (the account page's data, loaded once for every page). */
export type AccountState = ReturnType<typeof useAccount>

/**
 * What a page can do to the owner's business. Each call asks the repository, puts the answer in the shared state, and
 * resolves when that is done. Each rejects with an `OwnerError` (src/data/ownerRepository.ts) when the repository refuses,
 * and the page says why next to the field or the control.
 */
export type OwnerActions = {
  /** The setup wizard's last step. Fills the shared state with the new business and its menu. */
  createBusiness(input: NewBusinessInput): Promise<void>
  saveBusiness(patch: BusinessPatch): Promise<void>
  checkSlug(slug: string): Promise<SlugStatus>
  changeSlug(slug: string): Promise<void>
  setPublished(published: boolean): Promise<void>
  saveCategory(input: CategoryInput): Promise<void>
  moveCategory(id: string, delta: -1 | 1): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveProduct(input: ProductInput): Promise<void>
  moveProduct(id: string, delta: -1 | 1): Promise<void>
  deleteProduct(id: string): Promise<void>
  setAvailable(id: string, available: boolean): Promise<void>
  saveGroup(input: GroupInput): Promise<void>
  moveGroup(id: string, delta: -1 | 1): Promise<void>
  deleteGroup(id: string): Promise<void>
  /** Checks and keeps a picture, and gives back an address to show it. Nothing in the shared state changes. */
  uploadImage(file: File): Promise<string>
  /** The visitor numbers. Loaded on demand, because only one page shows them. */
  loadInsights(): Promise<Insights>
}

/** What every dashboard page reads. DashboardProvider loads it once and hands it down. */
export type DashboardData = {
  /** True until the business and the menu have arrived. */
  loading: boolean
  /** True when loading them failed. The provider shows the retry; pages never see this. */
  failed: boolean
  /** True while the retry after that failure is on its way (`loading` is true too). The provider keeps its failure view. */
  retrying: boolean
  retry: () => void
  /** True while the mock stands in for the server (everything is in this tab's memory). */
  demo: boolean
  /** "Now" in ms, to the minute. Tests set it. */
  now: number
  /** Null while loading, and null for an owner who has not been through the setup wizard. */
  business: Business | null
  /** Empty while loading or without a business. */
  menu: Menu
  account: AccountState
  /** Where the owner's plan stands, or null until the account has loaded. */
  access: Access | null
  /** The menu is on its public link: the owner published it and the trial or plan is running. */
  live: boolean
  actions: OwnerActions
}

export const DashboardDataContext = createContext<DashboardData | null>(null)

export function useDashboardData(): DashboardData {
  const data = useContext(DashboardDataContext)
  if (!data) throw new Error('useDashboardData must be used inside DashboardProvider')
  return data
}

/** For the pages behind RequireBusiness, which only render once the business exists. */
export function useOwnedBusiness(): DashboardData & { business: Business } {
  const data = useDashboardData()
  if (!data.business) throw new Error('useOwnedBusiness must be used behind RequireBusiness')
  return { ...data, business: data.business }
}
