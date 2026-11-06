import { useRef, type KeyboardEvent } from 'react'
import { copy } from '@/config/copy'
import { fill } from '@/shared/lib/fill'
import { Icon, type useMenuSearch } from '../kit'
import { joined } from './classes'
import styles from './SearchField.module.css'

const text = copy.menu.view.template.search

type Props = {
  search: ReturnType<typeof useMenuSearch>
  interactive: boolean
  /** For the opening of the page. */
  className?: string | undefined
}

/** "3 items found": read aloud as the list changes. */
const countText = (count: number) => fill(count === 1 ? text.count.one : text.count.many, { n: count })

/**
 * A ruled line to write on. It filters the menu for real (the hook owns the query), and a clear button appears while there is
 * something typed. In the Design preview it is a look-alike with no input and no tab stop.
 */
export function SearchField({ search, interactive, className }: Props) {
  const box = useRef<HTMLInputElement>(null)
  if (!interactive) {
    return (
      <div className={joined(styles.search, className)}>
        <div className={styles.field}>
          <Icon name="search" className={styles.icon} />
          <span className={styles.look}>{text.placeholder}</span>
        </div>
      </div>
    )
  }
  // Enter closes the keyboard of a phone so the result can be seen; Escape clears, as a search box does.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    else if (event.key === 'Escape') search.setQuery('')
  }
  // The clear button goes away as it is pressed, so the focus goes back to the box instead of being lost.
  const clear = () => {
    search.setQuery('')
    box.current?.focus()
  }
  return (
    <div className={joined(styles.search, className)} role="search">
      <div className={styles.field}>
        <Icon name="search" className={styles.icon} />
        <input
          ref={box}
          className={styles.input}
          type="search"
          value={search.query}
          placeholder={text.placeholder}
          aria-label={text.label}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          onChange={(event) => search.setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {search.query !== '' && (
          <button type="button" className={styles.clear} aria-label={text.clear} onClick={clear}>
            <span className={styles.clearDot}>
              <Icon name="close" />
            </span>
          </button>
        )}
      </div>
      <p className={styles.count} aria-live="polite">
        {search.searching ? countText(search.count) : ''}
      </p>
    </div>
  )
}
