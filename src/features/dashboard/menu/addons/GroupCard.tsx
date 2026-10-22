import { dashboardCopy } from '@/config/dashboardCopy'
import type { ModifierGroup } from '@/entities/menu/menu'
import { Button } from '@/shared/ui/Button'
import { IconEdit, IconTrash } from '@/shared/ui/icons'
import { fill } from '@/shared/lib/fill'
import { ReorderButtons } from '../ReorderButtons'
import styles from './GroupCard.module.css'
import { optionPriceText, ruleText, usedByText } from './groupText'

const text = dashboardCopy.addons.group

type Props = {
  group: ModifierGroup
  usedBy: number
  first: boolean
  last: boolean
  /** A move or a save is running: the controls wait so two calls cannot cross. */
  busy: boolean
  onMove: (delta: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}

/** One add-on group: its rule, its options with prices, how many items offer it, and what the owner can do with it. */
export function GroupCard({ group, usedBy, first, last, busy, onMove, onEdit, onDelete }: Props) {
  const named = (template: string) => fill(template, { name: group.name })
  return (
    <li className={styles.card} data-group={group.id}>
      <div className={styles.head}>
        <h3 className={styles.name}>{group.name}</h3>
        <span className={group.required ? `${styles.badge} ${styles.required}` : styles.badge}>
          {group.required ? text.required : text.optional}
        </span>
      </div>
      <p className={styles.rule}>{ruleText(group)}</p>
      <ul className={styles.options} aria-label={named(text.optionsLabel)}>
        {group.options.map((option) => (
          <li key={option.id} className={styles.option}>
            <span>{option.label}</span>
            <span className={styles.price}>{optionPriceText(option.price)}</span>
          </li>
        ))}
      </ul>
      <p className={styles.used}>{usedByText(usedBy)}</p>
      <div className={styles.tools}>
        <ReorderButtons
          id={group.id}
          variant="ghost"
          upLabel={named(text.moveUp)}
          downLabel={named(text.moveDown)}
          first={first}
          last={last}
          busy={busy}
          onMove={onMove}
        />
        <Button variant="secondary" size="sm" data-part="edit" aria-label={named(text.editLabel)} disabled={busy} onClick={onEdit}>
          <IconEdit size={18} />
          {text.edit}
        </Button>
        <Button variant="ghost" size="sm" data-part="delete" aria-label={named(text.deleteLabel)} disabled={busy} onClick={onDelete}>
          <IconTrash size={18} />
          {text.delete}
        </Button>
      </div>
    </li>
  )
}
