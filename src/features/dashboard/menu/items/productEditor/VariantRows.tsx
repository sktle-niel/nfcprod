import { useEffect, useId, useRef } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS } from '@/entities/menu/menu'
import { Button } from '@/shared/ui/Button'
import { IconPlus, IconTrash } from '@/shared/ui/icons'
import { parsePrice } from '@/entities/menu/price'
import { fill } from '@/shared/lib/fill'
import type { SizeRow } from './formState'
import styles from './VariantRows.module.css'

const text = dashboardCopy.productEditor.sizes

type Props = {
  rows: readonly SizeRow[]
  error: string | undefined
  /** The sizes the business type usually has, for the quick button. Empty when it has none. */
  presetSizes: readonly string[]
  onEdit: (key: string, patch: Partial<Pick<SizeRow, 'label' | 'price'>>) => void
  onAdd: () => void
  onRemove: (key: string) => void
  onPreset: () => void
}

/** The sizes of a product: a name and a price per row, added and removed one by one. */
export function VariantRows({ rows, error, presetSizes, onEdit, onAdd, onRemove, onPreset }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const addButton = useRef<HTMLButtonElement>(null)
  const afterRemove = useRef(false)
  const full = rows.length >= LIMITS.variants

  // After a row goes, focus would fall to the page: put it on "Add a size", which is enabled again by then.
  useEffect(() => {
    if (!afterRemove.current) return
    afterRemove.current = false
    addButton.current?.focus()
  }, [rows.length])

  return (
    <fieldset className={styles.sizes} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>{text.legend}</legend>
      <p className={styles.hint}>{text.hint}</p>
      <ul className={styles.list}>
        {rows.map((row, index) => {
          const number = String(index + 1)
          return (
            <li key={row.key} className={styles.row}>
              <input
                className={styles.input}
                data-field="variants"
                aria-label={text.nameLabel.replace('{n}', number)}
                aria-invalid={error && row.label.trim() === '' ? true : undefined}
                placeholder={text.namePlaceholder}
                maxLength={LIMITS.variantLabel}
                autoComplete="off"
                autoFocus={row.fresh}
                value={row.label}
                onChange={(event) => onEdit(row.key, { label: event.target.value })}
              />
              <input
                className={`${styles.input} ${styles.price}`}
                data-field="variants"
                aria-label={text.priceLabel.replace('{n}', number)}
                aria-invalid={error && parsePrice(row.price) === null ? true : undefined}
                placeholder={text.pricePlaceholder}
                inputMode="decimal"
                maxLength={12}
                autoComplete="off"
                value={row.price}
                onChange={(event) => onEdit(row.key, { price: event.target.value })}
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={fill(text.remove, { name: row.label.trim() || number })}
                onClick={() => {
                  afterRemove.current = true
                  onRemove(row.key)
                }}
              >
                <IconTrash size={18} />
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {/* The focus goes here when the list has no row to name in the refusal. */}
        <Button ref={addButton} data-field="variants" variant="secondary" size="sm" disabled={full} onClick={onAdd}>
          <IconPlus size={16} />
          {text.add}
        </Button>
        {presetSizes.length > 0 && !full && (
          <Button variant="ghost" size="sm" onClick={onPreset}>
            {text.quick.replace('{sizes}', presetSizes.join(', '))}
          </Button>
        )}
      </div>
      {full && <p className={styles.hint}>{text.full.replace('{max}', String(LIMITS.variants))}</p>}
    </fieldset>
  )
}
