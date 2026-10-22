import type { Category, ModifierGroup } from '@/entities/menu/menu'
import { validateGroupInput } from '@/entities/menu/validate'
import type { PresetGroup } from './types'

// Helpers for the preset tests only.

/** Categories as the menu keeps them, with ids, from a list of names. */
export function asCategories(names: readonly string[]): Category[] {
  return names.map((name, i) => ({ id: `c${i}`, name, visible: true }))
}

/** True when every group passes the group editor, one after the other, as a repository would add them. */
export function groupsPassEditor(groups: readonly PresetGroup[]): boolean {
  const added: ModifierGroup[] = []
  return groups.every((group, i) => {
    const ok = validateGroupInput(group, added).ok
    added.push({ ...group, id: `g${i}`, options: group.options.map((option, j) => ({ ...option, id: `g${i}o${j}` })) })
    return ok
  })
}
