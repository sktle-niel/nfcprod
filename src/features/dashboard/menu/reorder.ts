import { byAttr } from './usePendingFocus'

/** The `data-focus` value of an arrow: the id says whose row it is, so two rows never share one. */
export const reorderKey = {
  up: (id: string) => `up-${id}`,
  down: (id: string) => `down-${id}`,
} as const

/**
 * Where the focus goes after a row moves: the arrow that was pressed, and its twin for when that arrow went off at an end
 * of the list. The first one that is on wins, so this is the only place that rule is written.
 */
export function focusAfterMove(id: string, delta: -1 | 1): string[] {
  return delta === -1 ? [reorderKey.up(id), reorderKey.down(id)] : [reorderKey.down(id), reorderKey.up(id)]
}

/** `focusAfterMove` as selectors, for the pages that find a control by selector. */
export function reorderSelectors(id: string, delta: -1 | 1): string[] {
  return focusAfterMove(id, delta).map((key) => byAttr('data-focus', key))
}
