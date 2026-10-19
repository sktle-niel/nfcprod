import type { ReactNode } from 'react'
import { copy } from '@/config/copy'
import type { LocationRepository } from '@/data/locations'
import { Field } from '@/shared/ui/Field'
import { SelectField, type SelectOption } from '@/shared/ui/SelectField'
import styles from './PlaceFields.module.css'
import { usePlacePicker, type Level, type PlacesState } from './usePlacePicker'

type Props = {
  repository: LocationRepository
  errors: Partial<Record<Level, string | undefined>>
  /** The field that sits beside the barangay, so the form keeps its two columns. */
  children?: ReactNode
}

const LEVELS: readonly Level[] = ['province', 'city', 'barangay']
const AUTOCOMPLETE: Record<Level, string> = { province: 'address-level1', city: 'address-level2', barangay: 'address-level3' }

const toOptions = (state: PlacesState): SelectOption[] =>
  state.status === 'ready' ? state.places.map((place) => ({ value: place.code, label: place.name })) : []

/**
 * Province, city and barangay as three lists that fill each other, from the official PSGC lists.
 * If a list cannot be loaded, or the place is not on it, the same three fields turn into text boxes.
 * Either way the form gets plain names under `province`, `city` and `barangay`.
 */
export function PlaceFields({ repository, errors, children }: Props) {
  const { fields, places: text } = copy.order
  const { picked, lists, manual, failed, choose, toggle } = usePlacePicker(repository)

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
    <div className={styles.grid}>
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
