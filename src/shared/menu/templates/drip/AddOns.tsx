import { useId, useState } from 'react'
import type { ModifierGroup, Product } from '@/entities/menu/menu'
import { Icon, motion, ProductDetails } from '../kit'
import styles from './AddOns.module.css'

type Props = {
  /** What to show: `groups` are drawn for this product alone, without its sizes. */
  product: Product
  groups: ModifierGroup[]
  /** The words of the link, and its name for a screen reader when they differ. */
  label: string
  spoken?: string | undefined
  interactive: boolean
}

/**
 * A plain text link that opens the add-ons in place. Closed, the panel stays on the page at no height and out of reach (`inert`, and
 * hidden in the stylesheet), so opening and closing can ease. In the Design preview it is the same words, with nothing to press.
 */
export function AddOns({ product, groups, label, spoken, interactive }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  if (groups.length === 0) return null
  if (!interactive) {
    return (
      <span className={styles.toggle}>
        {label}
        <Icon name="chevronDown" />
      </span>
    )
  }
  return (
    <>
      <button type="button" className={`${styles.toggle} ${motion.press}`} aria-expanded={open} aria-controls={panelId} aria-label={spoken} onClick={() => setOpen((now) => !now)}>
        {label}
        <Icon name="chevronDown" />
      </button>
      <div id={panelId} className={styles.panel} data-open={open ? '' : undefined} inert={!open}>
        <div className={styles.fold}>
          <ProductDetails product={{ ...product, variants: [] }} groups={groups} ground="page" />
        </div>
      </div>
    </>
  )
}
