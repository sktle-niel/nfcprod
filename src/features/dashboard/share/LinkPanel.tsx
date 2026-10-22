import { useEffect, useId, useRef, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { menuState } from '@/entities/business/status'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { useOwnedBusiness } from '../dashboardData'
import { LinkActions } from '../LinkActions'
import { ChangeLink } from './ChangeLink'
import { OffAddressNote } from './OffAddressNote'
import styles from './Share.module.css'

const text = dashboardCopy.share.link

type Props = {
  url: string
}

/** The menu link: read it, copy it, open it, and change it. */
export function LinkPanel({ url }: Props) {
  const { business, access } = useOwnedBusiness()
  const menu = menuState(business, access)
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [changed, setChanged] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)

  // The form is gone and so is the dialog that held focus: put it back on the button that opened the form.
  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false
      trigger.current?.focus()
    }
  }, [editing])

  const close = () => {
    refocus.current = true
    setEditing(false)
  }

  return (
    <Panel title={text.title}>
      <label htmlFor={id} className={styles.label}>
        {text.label}
      </label>
      <input id={id} className={styles.readonly} readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      <LinkActions url={url} copyVariant="primary" note={changed ? text.changed : ''} onCopy={() => setChanged(false)}>
        <Button
          ref={trigger}
          variant="secondary"
          aria-expanded={editing}
          onClick={() => {
            setChanged(false)
            if (editing) close()
            else setEditing(true)
          }}
        >
          {text.change}
        </Button>
      </LinkActions>
      <OffAddressNote />
      {menu === 'draft' && <p className={styles.note}>{text.notLive}</p>}
      {menu === 'paused' && <p className={styles.note}>{business.published ? text.paused : text.pausedDraft}</p>}
      {editing && (
        <ChangeLink
          onCancel={close}
          onDone={() => {
            setChanged(true)
            close()
          }}
        />
      )}
    </Panel>
  )
}
