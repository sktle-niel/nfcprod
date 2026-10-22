import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { ownerDemo } from '@/data/ownerRepository'
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard'
import { Button, buttonClass } from '@/shared/ui/Button'
import { IconCopy, IconExternal } from '@/shared/ui/icons'
import ui from '@/shared/ui/ui.module.css'
import styles from './LinkActions.module.css'

const text = dashboardCopy.share.link

type Props = {
  url: string
  /** Share makes Copy the main button; the Overview already has a main action. */
  copyVariant?: 'primary' | 'secondary'
  /** More buttons in the row, after Open. */
  children?: ReactNode
  /** Words for the status line while there is no copy answer to give. */
  note?: string
  /** A press of Copy, so the page can drop a note that the answer would replace. */
  onCopy?: () => void
}

/**
 * The Copy and Open row of a menu link, with the one status line that says how copying went. Open goes to the owner's
 * preview in demo mode and to the public address in a new tab otherwise. The line stays in the
 * page the whole time: a screen reader speaks a change inside a region that exists, but often misses one that appears
 * together with its text. A failure is said in the same line, in the error look.
 */
export function LinkActions({ url, copyVariant = 'secondary', children, note = '', onCopy }: Props) {
  const { state, copy: copyUrl } = useCopyToClipboard(url)
  const message = state === 'copied' ? text.copied : state === 'failed' ? text.copyFailed : note

  return (
    <>
      <div className={styles.actions}>
        <Button
          variant={copyVariant}
          onClick={() => {
            onCopy?.()
            void copyUrl()
          }}
        >
          <IconCopy size={18} />
          {text.copy}
        </Button>
        {ownerDemo ? (
          // In demo mode the menu lives in this tab's memory, so a new tab at the public address would show nothing.
          // The owner's preview shows the same menu, draft or live, in the public layout.
          <Link className={buttonClass('secondary')} to="/dashboard/preview">
            <IconExternal size={18} />
            {text.open}
          </Link>
        ) : (
          <a className={buttonClass('secondary')} href={url} target="_blank" rel="noopener noreferrer">
            <IconExternal size={18} />
            {text.open} <span className={ui.visuallyHidden}>{text.newTab}</span>
          </a>
        )}
        {children}
      </div>
      <p role="status" className={styles.note} data-state={state === 'failed' ? 'error' : 'ok'}>
        {message}
      </p>
    </>
  )
}
