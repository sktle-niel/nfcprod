import { useId, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Menu } from '@/entities/menu/menu'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'
import { MenuPreviewFrame } from '@/shared/menu/MenuPreviewFrame'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import styles from './PreviewPanel.module.css'

const text = dashboardCopy.design.preview

type Props = { business: MenuViewBusiness; menu: Menu; className?: string | undefined }

/** The menu as the draft would show it. On a phone it is folded away until the owner asks for it. */
export function PreviewPanel({ business, menu, className }: Props) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  return (
    <Panel
      className={className}
      title={text.title}
      action={
        <span className={styles.toggle}>
          <Button variant="secondary" size="sm" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((value) => !value)}>
            {open ? text.hide : text.show}
          </Button>
        </span>
      }
    >
      <div id={bodyId} className={styles.body} data-open={open}>
        <p className={styles.hint}>{text.hint}</p>
        <MenuPreviewFrame business={business} menu={menu} />
      </div>
    </Panel>
  )
}
