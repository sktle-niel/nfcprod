import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS, type ModifierGroup } from '@/entities/menu/menu'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Modal } from '@/shared/ui/Modal'
import { Switch } from '@/shared/ui/Switch'
import { fill } from '@/shared/lib/fill'
import styles from './GroupEditor.module.css'
import { withRequired, withRows } from './groupForm'
import { ruleText } from './groupText'
import { LimitFields } from './LimitFields'
import { OptionRows } from './OptionRows'
import { useGroupForm } from './useGroupForm'

const text = dashboardCopy.addons.editor

type Props = {
  /** The group to change, or null to make a new one. */
  group: ModifierGroup | null
  /** Called with the saved name, just before the editor closes. */
  onSaved: (name: string) => void
  onClose: () => void
}

/** The editor of one add-on group, in a dialog. It closes through `onClose` after a save or on cancel. */
export function GroupEditor({ group, onSaved, onClose }: Props) {
  const { draft, setDraft, messages, note, busy, submit } = useGroupForm(group)
  const min = Number(draft.min)
  const max = Number(draft.max)
  const preview = /^\d{1,3}$/.test(draft.min) && /^\d{1,3}$/.test(draft.max) && max >= 1 && min <= max

  return (
    <Modal wide title={group ? fill(text.editTitle, { name: group.name }) : text.addTitle} closeLabel={text.close} busy={busy} onClose={onClose}>
      {(close) => (
        <form
          className={styles.form}
          noValidate
          onSubmit={async (event) => {
            const saved = await submit(event)
            if (saved === null) return
            onSaved(saved)
            close()
          }}
        >
          <Field
            name="name"
            label={text.name}
            hint={text.nameHint}
            autoComplete="off"
            error={messages.name}
            maxLength={LIMITS.groupName}
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <Switch label={text.required} description={text.requiredHint} checked={draft.required} onChange={(required) => setDraft(withRequired(draft, required))} />
          <LimitFields draft={draft} messages={messages} onChange={setDraft} />
          {preview && (
            <p className={styles.rule}>{text.rule.replace('{rule}', ruleText({ required: draft.required, min, max }))}</p>
          )}
          <OptionRows rows={draft.rows} messages={messages} onChange={(rows) => setDraft(withRows(draft, rows))} />
          {note && (
            <p role="alert" className={styles.note}>
              {note}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={close}>
              {text.cancel}
            </Button>
            <Button type="submit" busy={busy}>
              {busy ? text.saving : text.save}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
