import { dashboardCopy } from '@/config/dashboardCopy'
import { useAsyncAction } from '@/features/dashboard/useAsyncAction'
import { ownerErrorText } from '@/features/dashboard/ownerErrors'
import { useOwnedBusiness } from '@/features/dashboard/dashboardData'
import { mergePresets } from '@/presets'
import { Button } from '@/shared/ui/Button'
import { IconPlus } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import { fill } from '@/shared/lib/fill'
import styles from './EmptyMenu.module.css'
import { focusKeys, type Notify } from './notify'

const text = dashboardCopy.items

type Props = {
  onAdd: () => void
  notify: Notify
}

/** A menu with no category yet: says what a category is, and offers the usual ones for the owner's kind of business. */
export function EmptyMenu({ onAdd, notify }: Props) {
  const { business, actions } = useOwnedBusiness()
  const { run, busy, error } = useAsyncAction()
  const suggestions = mergePresets(business.types).categories

  async function addSuggestion(name: string) {
    const outcome = await run(() => actions.saveCategory({ name, visible: true }))
    if (outcome.ok) notify(fill(dashboardCopy.items.category.added, { name }), focusKeys.addCategory)
  }

  return (
    <Panel title={text.empty.title}>
      <p className={styles.body}>{text.empty.body}</p>
      <div className={styles.add}>
        <Button data-focus={focusKeys.addCategory} onClick={onAdd}>
          <IconPlus size={18} />
          {text.toolbar.addCategory}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <>
          <h3 className={styles.heading}>{text.empty.suggestions}</h3>
          <ul className={styles.list}>
            {suggestions.map((name) => (
              <li key={name}>
                <Button variant="secondary" size="sm" busy={busy} onClick={() => addSuggestion(name)}>
                  <IconPlus size={16} />
                  {fill(text.empty.addSuggestion, { name })}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error !== null && (
        <p role="alert" className={styles.alert}>
          {ownerErrorText(error)}
        </p>
      )}
    </Panel>
  )
}
