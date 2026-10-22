import { useRef, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS, type ModifierGroup } from '@/entities/menu/menu'
import { mergePresets } from '@/presets'
import { matchKey } from '@/shared/lib/checks'
import { plural } from '@/shared/lib/plural'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { IconPlus } from '@/shared/ui/icons'
import { Panel } from '@/shared/ui/Panel'
import { fill } from '@/shared/lib/fill'
import { useOwnedBusiness } from '../../dashboardData'
import { LiveStatus } from '../LiveStatus'
import { usePendingFocus } from '../usePendingFocus'
import styles from './AddonsTab.module.css'
import { GroupCard } from './GroupCard'
import { GroupEditor } from './GroupEditor'
import { usedByCount } from './groupText'
import { Suggestions } from './Suggestions'
import { ADD_BUTTON, groupPart, LAST_GROUP_EDIT, useGroupActions } from './useGroupActions'

const text = dashboardCopy.addons

/** The Add-ons tab of the Menu page: the owner's add-on groups, the editor, and groups suggested for the business. */
export function AddonsTab() {
  const { business, menu } = useOwnedBusiness()
  const root = useRef<HTMLDivElement>(null)
  const focusLater = usePendingFocus(root)
  const { busy, announcement, announce, failure, removeFailure, clearRemoveFailure, move, remove, addSuggestion } = useGroupActions(focusLater)
  // `editing.group` is null for a new group.
  const [editing, setEditing] = useState<{ group: ModifierGroup | null } | null>(null)
  const [deleting, setDeleting] = useState<ModifierGroup | null>(null)

  const { groups } = menu
  const full = groups.length >= LIMITS.groups
  const have = new Set(groups.map((group) => matchKey(group.name)))
  const presetGroups = mergePresets(business.types).groups
  const suggested = presetGroups.filter((group) => !have.has(matchKey(group.name)))

  const closeEditor = () => {
    focusLater(editing?.group ? groupPart(editing.group.id, 'edit') : ADD_BUTTON, ADD_BUTTON, LAST_GROUP_EDIT)
    setEditing(null)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const at = groups.findIndex((group) => group.id === deleting.id)
    if (await remove(deleting, groups[at + 1] ?? groups[at - 1])) setDeleting(null)
  }

  const cancelDelete = () => {
    clearRemoveFailure()
    if (deleting) focusLater(groupPart(deleting.id, 'delete'), ADD_BUTTON)
    setDeleting(null)
  }

  const usedBy = deleting ? usedByCount(menu, deleting.id) : 0

  return (
    <div ref={root} className={styles.tab}>
      <p className={styles.intro}>{text.intro}</p>
      <LiveStatus message={announcement.message} version={announcement.version} />
      <Panel
        title={text.listTitle}
        action={
          <Button size="sm" data-part="add-group" disabled={full || busy} onClick={() => setEditing({ group: null })}>
            <IconPlus size={18} />
            {text.add}
          </Button>
        }
      >
        {full && <p className={styles.note}>{text.limit.replace('{max}', String(LIMITS.groups))}</p>}
        {failure && (
          <p role="alert" className={styles.failure}>
            {failure}
          </p>
        )}
        {groups.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>{text.empty.title}</h3>
            <p className={styles.emptyBody}>{text.empty.body}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {groups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                usedBy={usedByCount(menu, group.id)}
                first={index === 0}
                last={index === groups.length - 1}
                busy={busy}
                onMove={(delta) => void move(group, delta, index + delta, groups.length)}
                onEdit={() => setEditing({ group })}
                onDelete={() => {
                  clearRemoveFailure()
                  setDeleting(group)
                }}
              />
            ))}
          </ul>
        )}
      </Panel>
      {presetGroups.length > 0 && (
        <Suggestions groups={suggested} disabled={full || busy} onAdd={(group, next) => void addSuggestion(group, next)} />
      )}
      {editing && (
        <GroupEditor
          group={editing.group}
          onSaved={(name) => announce(editing.group ? text.announce.saved : text.announce.added, name)}
          onClose={closeEditor}
        />
      )}
      {deleting && (
        <ConfirmDialog
          danger
          busy={busy}
          title={fill(text.confirmDelete.title, { name: deleting.name })}
          body={
            <>
              {usedBy === 0 ? text.confirmDelete.bodyUnused : plural(usedBy, text.confirmDelete.bodyUsed)}
              {removeFailure && <strong role="alert" className={styles.inline}> {removeFailure}</strong>}
            </>
          }
          confirmLabel={text.confirmDelete.confirm}
          cancelLabel={text.confirmDelete.cancel}
          closeLabel={text.confirmDelete.close}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      )}
    </div>
  )
}
