import { useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { ModifierGroup } from '@/entities/menu/menu'
import type { PresetGroup } from '@/presets/types'
import { fill } from '@/shared/lib/fill'
import { useOwnedBusiness } from '../../dashboardData'
import { ownerErrorText } from '../../ownerErrors'
import { useAsyncAction } from '../../useAsyncAction'
import { movedText } from '../movedText'
import { reorderSelectors } from '../reorder'
import { byAttr } from '../usePendingFocus'

const text = dashboardCopy.addons

/** Selectors of the controls that focus is given back to. */
export const ADD_BUTTON = '[data-part="add-group"]'
/**
 * The Edit button of the last group, where a new group lands. It is the last choice for focus: at the limit of groups Add
 * and every suggestion are off, and focus would otherwise fall to the top of the page.
 */
export const LAST_GROUP_EDIT = '[data-group]:last-child [data-part="edit"]'
export const groupPart =(id: string, part: string) => `${byAttr('data-group', id)} ${byAttr('data-part', part)}`
export const suggestionAdd = (name: string) => `${byAttr('data-suggestion', name)} button`

type FocusLater = (...selectors: string[]) => void

/**
 * The quick actions of the add-on list (move, delete, add a suggestion). Each runs against the repository, says in words
 * what happened (in `announcement`, for a live region) or why it failed, and puts focus somewhere sensible. A failed move
 * or suggestion is `failure`, shown on the list; a failed delete is `removeFailure`, shown in the delete question. They are
 * kept apart so an old failure never shows up inside a question that has just been opened.
 */
export function useGroupActions(focusLater: FocusLater) {
  const { actions } = useOwnedBusiness()
  const change = useAsyncAction()
  const removal = useAsyncAction()
  const [said, setSaid] = useState({ message: '', version: 0 })
  const announceText = (message: string) => setSaid((current) => ({ message, version: current.version + 1 }))
  const say = (template: string, name: string) => announceText(fill(template, { name }))

  const move = async (group: ModifierGroup, delta: -1 | 1, at: number, count: number) => {
    const outcome = await change.run(() => actions.moveGroup(group.id, delta))
    if (!outcome.ok) return
    // Moving swaps the nodes, so the browser drops focus from the button; it goes back to it, or to its twin at the end.
    focusLater(...reorderSelectors(group.id, delta))
    announceText(movedText(text.announce.moved, group.name, at, count))
  }

  /** Deletes the group. Gives back true when it is gone. `neighbour` is the group that takes over focus. */
  const remove = async (group: ModifierGroup, neighbour: ModifierGroup | undefined): Promise<boolean> => {
    const outcome = await removal.run(() => actions.deleteGroup(group.id))
    if (!outcome.ok) return false
    focusLater(...(neighbour ? [groupPart(neighbour.id, 'edit')] : []), ADD_BUTTON)
    say(text.announce.deleted, group.name)
    return true
  }

  const addSuggestion = async (preset: PresetGroup, next: PresetGroup | undefined) => {
    const outcome = await change.run(() => actions.saveGroup(preset))
    if (!outcome.ok) return
    focusLater(...(next ? [suggestionAdd(next.name)] : []), ADD_BUTTON, LAST_GROUP_EDIT)
    say(text.announce.added, preset.name)
  }

  return {
    busy: change.busy || removal.busy,
    announcement: said,
    announce: say,
    failure: change.error === null ? null : ownerErrorText(change.error),
    removeFailure: removal.error === null ? null : ownerErrorText(removal.error),
    clearRemoveFailure: removal.clear,
    move,
    remove,
    addSuggestion,
  }
}
