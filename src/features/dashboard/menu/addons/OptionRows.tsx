import { useId, useRef, useState } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { LIMITS } from '@/entities/menu/menu'
import { Button } from '@/shared/ui/Button'
import { IconPlus, IconTrash } from '@/shared/ui/icons'
import ui from '@/shared/ui/ui.module.css'
import { emptyRow, moveRow, type GroupMessages, type OptionRow } from './groupForm'
import { LiveStatus } from '../LiveStatus'
import { movedText } from '../movedText'
import { reorderSelectors } from '../reorder'
import { ReorderButtons } from '../ReorderButtons'
import { byAttr, usePendingFocus } from '../usePendingFocus'
import styles from './OptionRows.module.css'

const text = dashboardCopy.addons.editor

type Props = {
  rows: readonly OptionRow[]
  messages: GroupMessages
  onChange: (rows: OptionRow[]) => void
}

const row = (key: string, part: string) => `${byAttr('data-row', key)} ${byAttr('data-part', part)}`

/** The options of a group: a name and a price each, with add, remove and move. */
export function OptionRows({ rows, messages, onChange }: Props) {
  const root = useRef<HTMLFieldSetElement>(null)
  const focusLater = usePendingFocus(root)
  const id = useId()
  const [said, setSaid] = useState({ message: '', version: 0 })
  const full = rows.length >= LIMITS.options
  const sentence = (template: string, n: number) => template.replace('{n}', String(n))

  const update = (key: string, change: Partial<OptionRow>) =>
    onChange(rows.map((candidate) => (candidate.key === key ? { ...candidate, ...change } : candidate)))

  const add = () => {
    const fresh = emptyRow()
    focusLater(row(fresh.key, 'label'))
    onChange([...rows, fresh])
  }

  const remove = (index: number) => {
    const next = rows[index + 1] ?? rows[index - 1]
    if (next) focusLater(row(next.key, 'label'))
    onChange(rows.filter((_, at) => at !== index))
  }

  const move = (key: string, delta: -1 | 1) => {
    const from = rows.findIndex((candidate) => candidate.key === key)
    const name = rows[from]?.label.trim() || text.unnamedOption
    focusLater(...reorderSelectors(key, delta))
    setSaid((current) => ({ message: movedText(text.optionMoved, name, from + delta, rows.length), version: current.version + 1 }))
    onChange(moveRow(rows, key, delta))
  }

  return (
    <fieldset ref={root} className={styles.set} aria-describedby={`${id}-hint`}>
      <legend className={styles.legend}>{text.options}</legend>
      <p id={`${id}-hint`} className={styles.hint}>
        {text.optionsHint.replace('{max}', String(LIMITS.options))}
      </p>
      <LiveStatus message={said.message} version={said.version} />
      <ul className={styles.list}>
        {rows.map((option, index) => {
          const problem = messages.rows[option.key]
          const n = index + 1
          return (
            <li key={option.key} className={styles.row} data-row={option.key}>
              <div className={styles.inputs}>
                <div className={styles.label}>
                  <input
                    className={ui['field']}
                    data-part="label"
                    value={option.label}
                    maxLength={LIMITS.optionLabel}
                    placeholder={text.optionNamePlaceholder}
                    aria-label={sentence(text.optionName, n)}
                    aria-invalid={problem?.label ? true : undefined}
                    aria-describedby={problem?.label ? `${id}-${option.key}-label` : undefined}
                    onChange={(event) => update(option.key, { label: event.target.value })}
                  />
                </div>
                <div className={styles.price}>
                  <span className={styles.peso} aria-hidden="true">
                    {text.pesoSign}
                  </span>
                  <input
                    className={`${ui['field']} ${styles.priceInput}`}
                    data-part="price"
                    value={option.price}
                    inputMode="decimal"
                    maxLength={12}
                    placeholder={text.pricePlaceholder}
                    aria-label={sentence(text.optionPrice, n)}
                    aria-invalid={problem?.price ? true : undefined}
                    aria-describedby={problem?.price ? `${id}-${option.key}-price` : undefined}
                    onChange={(event) => update(option.key, { price: event.target.value })}
                  />
                </div>
              </div>
              <div className={styles.tools}>
                <ReorderButtons
                  id={option.key}
                  variant="ghost"
                  upLabel={sentence(text.moveOptionUp, n)}
                  downLabel={sentence(text.moveOptionDown, n)}
                  first={index === 0}
                  last={index === rows.length - 1}
                  onMove={(delta) => move(option.key, delta)}
                />
                <Button variant="ghost" size="sm" aria-label={sentence(text.removeOption, n)} disabled={rows.length === 1} onClick={() => remove(index)}>
                  <IconTrash size={18} />
                </Button>
              </div>
              {problem?.label && (
                <p id={`${id}-${option.key}-label`} className={styles.error}>
                  {problem.label}
                </p>
              )}
              {problem?.price && (
                <p id={`${id}-${option.key}-price`} className={styles.error}>
                  {problem.price}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {messages.options && <p className={styles.error}>{messages.options}</p>}
      <div className={styles.foot}>
        <Button variant="secondary" size="sm" disabled={full} onClick={add}>
          <IconPlus size={18} />
          {text.addOption}
        </Button>
        <span className={styles.count}>{text.optionCount.replace('{n}', String(rows.length)).replace('{max}', String(LIMITS.options))}</span>
      </div>
    </fieldset>
  )
}
