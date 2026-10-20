import type { ReactNode } from 'react'
import { copy } from '@/config/copy'
import { Field } from '@/shared/ui/Field'
import { SelectField, type SelectOption } from '@/shared/ui/SelectField'
import styles from './PlaceFields.module.css'
import { LEVELS, type Level, type PlacePicker, type PlacesState } from './usePlacePicker'

type Props = {
  /** Built by the form (`usePlacePicker`), so that the map beside these fields can fill them too. */
  picker: PlacePicker
  errors: Partial<Record<Level, string | undefined>>
  /** The field that sits beside the barangay, so the form keeps its two columns. */
  children?: ReactNode
}

const AUTOCOMPLETE: Record<Level, string> = { province: 'address-level1', city: 'address-level2', barangay: 'address-level3' }

const toOptions = (state: PlacesState): SelectOption[] =>
  state.status === 'ready' ? state.places.map((place) => ({ value: place.code, label: place.name })) : []

/**
 * Province, city and barangay as three lists that fill each other, from the official PSGC lists.
 * If a list cannot be loaded, or the place is not on it, the same three fields turn into text boxes.
 * Either way the form gets plain names under `province`, `city` and `barangay`.
 */
export function PlaceFields({ picker, errors, children }: Props) {
  const { fields, places: text } = copy.order
  const { picked, lists, manual, failed, grid, choose, toggle } = picker

  const placeholder = (level: Level): string => {
    if (level !== 'province' && !(level === 'city' ? picked.province : picked.city)) return text.chooseFirst[level]
    return lists[level].status === 'ready' ? text.choose[level] : text.loading
  }

  const listed = (level: Level) => (
    <SelectField
      name={level}
      label={fields[level].label}
      value={picked[level]?.code ?? ''}
      options={toOptions(lists[level])}
      placeholder={placeholder(level)}
      busy={lists[level].status === 'loading'}
      disabled={lists[level].status !== 'ready'}
      onChange={(code) => choose(level, code)}
      error={errors[level]}
    />
  )

  // No key: a box keeps its node, its text and its focus when the map sets its level. The picker writes the new name into
  // the box. `defaultValue` only shows what was picked when the boxes first appear.
  const typed = (level: Level) => (
    <Field
      name={level}
      label={fields[level].label}
      placeholder={fields[level].placeholder}
      autoComplete={AUTOCOMPLETE[level]}
      maxLength={60}
      defaultValue={picked[level]?.name}
      error={errors[level]}
    />
  )

  return (
    <div ref={grid} className={styles.grid}>
      {manual ? (
        <>
          {typed('province')}
          {typed('city')}
          {typed('barangay')}
        </>
      ) : (
        <>
          {listed('province')}
          {listed('city')}
          {listed('barangay')}
          {LEVELS.map((level) => (
            <input key={level} type="hidden" name={level} value={picked[level]?.name ?? ''} />
          ))}
        </>
      )}
      {children}
      <p role="status" className={styles.note}>
        {failed ? text.failed : ''}
      </p>
      <button type="button" className={styles.switch} onClick={toggle}>
        {failed ? text.tryAgain : manual ? text.useList : text.typeInstead}
      </button>
    </div>
  )
}
