import { useId, useState, type KeyboardEvent } from 'react'
import { copy } from '@/config/copy'
import type { ReverseGeocoder } from '@/data/geocoder'
import type { Pin } from '@/entities/location/pin'
import styles from './MapPicker.module.css'
import { useMapPinSearch, type SearchState } from './useMapPinSearch'

type Props = {
  geocoder: ReverseGeocoder
  /** The customer chose a result. The panel moves the map there; the customer still taps to place the pin. */
  onChoose: (spot: Pin) => void
}

const QUERY_MAX = 100

function noteFor(state: SearchState): string {
  const text = copy.order.map
  switch (state.phase) {
    case 'searching':
      return text.searching
    case 'failed':
      return text.searchFailed
    case 'done':
      return state.hits.length > 0 ? text.results : text.noResults
    case 'idle':
      return ''
  }
}

/**
 * "Find a place": a name goes to the map service when the customer submits, and never while they type.
 * It is a group of controls and not a form, because it sits inside the order form and forms cannot nest.
 * That is also why Enter is caught here: it would otherwise send the whole order.
 */
export function MapPickerSearch({ geocoder, onChoose }: Props) {
  const text = copy.order.map
  const id = useId()
  const [query, setQuery] = useState('')
  const { state, search, clear } = useMapPinSearch(geocoder)

  const submit = () => search(query)
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    submit()
  }

  return (
    <div role="search" className={styles.search}>
      <label htmlFor={`${id}-query`} className={styles.label}>
        {text.searchLabel}
      </label>
      <div className={styles.searchRow}>
        {/* No name: the order form must not send what the customer looked for. */}
        <input
          id={`${id}-query`}
          type="search"
          className={styles.input}
          value={query}
          maxLength={QUERY_MAX}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={styles.button} onClick={submit}>
          {text.searchSubmit}
        </button>
      </div>
      <p id={`${id}-note`} role="status" className={styles.note}>
        {noteFor(state)}
      </p>
      {state.phase === 'done' && state.hits.length > 0 && (
        <>
          {/* The labels are map text: they are only ever shown as plain text. */}
          <ul aria-labelledby={`${id}-note`} className={styles.hits}>
            {state.hits.map((hit, index) => (
              <li key={`${index}:${hit.pin.lat},${hit.pin.lng}`}>
                <button
                  type="button"
                  className={styles.hit}
                  onClick={() => {
                    clear()
                    onChoose(hit.pin)
                  }}
                >
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.credit}>{text.attributionNote}</p>
        </>
      )}
    </div>
  )
}
