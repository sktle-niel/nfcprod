import { Button } from '@/shared/ui/Button'
import { IconArrowDown, IconArrowUp } from '@/shared/ui/icons'
import { reorderKey } from './reorder'

type Props = {
  /** Names the pair for the focus: the id of the row it moves. */
  id: string
  upLabel: string
  downLabel: string
  /** Already first or last: that arrow is off. */
  first: boolean
  last: boolean
  /** A save is running: both arrows wait so two moves cannot cross. */
  busy?: boolean
  /** Secondary beside other secondary buttons, ghost beside ghost ones. */
  variant?: 'secondary' | 'ghost'
  onMove: (delta: -1 | 1) => void
}

/**
 * The two arrows that move a category, item, add-on group or option one place. Icon-only, so each carries a name that
 * says what moves. They are marked with `data-focus` (see `focusAfterMove`) so the page can give the focus back to them.
 */
export function ReorderButtons({ id, upLabel, downLabel, first, last, busy = false, variant = 'secondary', onMove }: Props) {
  return (
    <>
      <Button variant={variant} size="sm" aria-label={upLabel} data-focus={reorderKey.up(id)} disabled={first || busy} onClick={() => onMove(-1)}>
        <IconArrowUp size={18} />
      </Button>
      <Button variant={variant} size="sm" aria-label={downLabel} data-focus={reorderKey.down(id)} disabled={last || busy} onClick={() => onMove(1)}>
        <IconArrowDown size={18} />
      </Button>
    </>
  )
}
