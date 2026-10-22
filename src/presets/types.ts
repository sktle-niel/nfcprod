import type { BusinessType } from '@/entities/business/business'
import type { ProductTag } from '@/entities/menu/menu'
import type { Theme } from '@/entities/theme/theme'

/** An add-on group a preset starts the menu with. */
export type PresetGroup = {
  name: string
  required: boolean
  min: number
  max: number
  options: { label: string; price: number }[]
}

/** An example item a preset can put on the menu, for the owner to edit or delete. Prices are integer centavos. */
export type PresetSample = {
  /** One of the preset's own category names. */
  category: string
  name: string
  description: string
  price: number
  tags: ProductTag[]
  /** False for an item that has one price although its preset has sizes (a pastry on a coffee menu). Sizes are the default. */
  sized?: boolean
}

/** The recommended start for one kind of business. Plain data: everything stays editable. */
export type Preset = {
  type: BusinessType
  /** First categories, in order. */
  categories: string[]
  /** The look it starts from: one of the ready-made menu styles (`styleTheme`) in that style's own mode. */
  theme: Theme
  groups: PresetGroup[]
  /** Size labels, for example "S", "M", "L". Empty when the kind of business has no sizes. */
  sizes: string[]
  samples: PresetSample[]
}

/** Several presets of a hybrid business, merged: no duplicate categories or groups. */
export type MergedPreset = Omit<Preset, 'type'> & { types: BusinessType[] }
