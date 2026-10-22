import { dashboardCopy } from '@/config/dashboardCopy'
import type { PresetGroup } from '@/presets/types'
import { Button } from '@/shared/ui/Button'
import { IconPlus } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import { fill } from '@/shared/lib/fill'
import { optionsSummary, ruleText } from './groupText'
import styles from './Suggestions.module.css'

const text = dashboardCopy.addons.suggestions

type Props = {
  /** The preset groups the business does not have yet. */
  groups: readonly PresetGroup[]
  /** At the limit of groups, or an action is running. */
  disabled: boolean
  onAdd: (group: PresetGroup, next: PresetGroup | undefined) => void
}

/** Ready-made groups for the kind of business. One click adds a group, which can then be edited like any other. */
export function Suggestions({ groups, disabled, onAdd }: Props) {
  return (
    <Panel title={text.title}>
      <p className={styles.body}>{groups.length > 0 ? text.body : text.allAdded}</p>
      {groups.length > 0 && (
        <ul className={styles.list}>
          {groups.map((group, index) => (
            <li key={group.name} className={styles.item} data-suggestion={group.name}>
              <div className={styles.text}>
                <h3 className={styles.name}>{group.name}</h3>
                <p className={styles.detail}>
                  {text.detail.replace('{rule}', ruleText(group)).replace('{options}', optionsSummary(group.options))}
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled={disabled} aria-label={fill(text.addLabel, { name: group.name })} onClick={() => onAdd(group, groups[index + 1])}>
                <IconPlus size={18} />
                {text.add}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
