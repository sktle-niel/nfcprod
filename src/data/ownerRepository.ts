import type { Business, BusinessPatch, NewBusinessInput, SlugStatus } from '@/entities/business/business'
import type { CategoryInput, GroupInput, Menu, ProductInput } from '@/entities/menu/menu'

/** Why a call of the repository failed. The screen turns a code into words, never shows it as it is. */
export type OwnerFailure =
  /** The input did not pass the checks. `fields` says which part. */
  | 'invalid'
  | 'slugTaken'
  | 'notFound'
  | 'signedOut'
  /** A picture over the size limit. */
  | 'tooLarge'
  /** A picture that is not a JPEG, PNG or WebP. */
  | 'unsupported'
  | 'network'

export class OwnerError extends Error {
  code: OwnerFailure
  /** Field name to error code, when the failure is about fields. */
  fields: Record<string, string>

  constructor(code: OwnerFailure, fields: Record<string, string> = {}) {
    super(code)
    this.code = code
    this.fields = fields
  }
}

/** One day of the sample numbers: times the menu link was opened, and times the card was tapped. */
export type DayPoint = { date: string; views: number; taps: number }

/** What the Overview shows about the menu's visitors. Sample numbers until the analytics store exists. */
export type Insights = {
  demo: boolean
  /** Oldest first. */
  days: DayPoint[]
  topItems: { name: string; views: number }[]
}

/**
 * The seam between the owner's dashboard and wherever the business is kept (Supabase later). The server knows the owner
 * from the session, so nothing here names an account or a business. Every change comes back as the new whole: the new
 * `Menu` for the menu calls, the new `Business` for the business calls. ARCHITECTURE section 3.3.
 */
export interface OwnerRepository {
  /** The owner's business, or null before the setup wizard has run. */
  getBusiness(): Promise<Business | null>
  /** Makes the business with the presets of `types` applied. Throws `OwnerError` ('invalid', 'slugTaken'). */
  createBusiness(input: NewBusinessInput): Promise<{ business: Business; menu: Menu }>
  /** Changes the Design page's fields. Throws `OwnerError` ('invalid', 'notFound'). */
  saveBusiness(patch: BusinessPatch): Promise<Business>
  /** Says where a slug stands, without changing anything. */
  checkSlug(slug: string): Promise<SlugStatus>
  /**
   * Changes the link written on the NFC cards. The old link stays reserved for this business and is never given to
   * another one, so a card or a QR code written with it can never open someone else's menu (a server keeps a redirect
   * table from the old link to the new one). A business may go back to a link it had. Throws `OwnerError` ('invalid',
   * 'slugTaken', 'notFound').
   */
  changeSlug(slug: string): Promise<Business>
  /** Puts the menu on its public link, or takes it off. A plan that ended pauses it whatever this says. */
  setPublished(published: boolean): Promise<Business>

  getMenu(): Promise<Menu>
  /** Adds a category, or changes the one with `input.id`. Throws `OwnerError` ('invalid', 'notFound'). */
  saveCategory(input: CategoryInput): Promise<Menu>
  /** Moves a category one place up (-1) or down (1). */
  moveCategory(id: string, delta: -1 | 1): Promise<Menu>
  /** Deletes a category and the products in it. */
  deleteCategory(id: string): Promise<Menu>
  saveProduct(input: ProductInput): Promise<Menu>
  /** Moves a product one place up or down inside its category. */
  moveProduct(id: string, delta: -1 | 1): Promise<Menu>
  deleteProduct(id: string): Promise<Menu>
  /** The quick sold-out switch. */
  setAvailable(id: string, available: boolean): Promise<Menu>
  saveGroup(input: GroupInput): Promise<Menu>
  moveGroup(id: string, delta: -1 | 1): Promise<Menu>
  /** Deletes an add-on group and takes it off every product that offered it. */
  deleteGroup(id: string): Promise<Menu>

  /**
   * Checks a picture (type from its first bytes, not its name; at most `IMAGE_MAX_BYTES`) and keeps it. Gives back an
   * address the browser can show. Throws `OwnerError` ('unsupported', 'tooLarge').
   */
  uploadImage(file: File): Promise<string>
  insights(): Promise<Insights>
}

/** True while the mock stands in for the server: the business lives in this tab's memory and is gone on reload. */
export const ownerDemo = true
