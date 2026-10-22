import { useId, useRef, type ReactNode } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { plural } from '@/shared/lib/plural'
import { Button } from '@/shared/ui/Button'
import ui from '@/shared/ui/ui.module.css'
import styles from './ItemsToolbar.module.css'
import { focusKeys } from './notify'
import type { ItemsView } from './useItemsFilter'

const text = dashboardCopy.items.toolbar

type Props = {
  query: string
  onQuery: (query: string) => void
  view: ItemsView
  /** The "Add category" button, which the tab owns because it opens the tab's form. */
  children: ReactNode
}

/** Add category, the search box, and the counts: how many items in all, and how many the search found. */
export function ItemsToolbar({ query, onQuery, view, children }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={styles.toolbar}>
      {children}
      <div className={styles.search}>
        <label htmlFor={id} className={ui.visuallyHidden}>
          {text.searchLabel}
        </label>
        <input
          ref={input}
          id={id}
          data-focus={focusKeys.search}
          type="search"
          className={`${ui.field} ${styles.input}`}
          value={query}
          maxLength={80}
          placeholder={text.searchPlaceholder}
          autoComplete="off"
          onChange={(event) => onQuery(event.target.value)}
        />
        {query !== '' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onQuery('')
              // The button goes with the query, so the focus would fall to the page.
              input.current?.focus()
            }}
          >
            {text.clearSearch}
          </Button>
        )}
      </div>
      <p className={styles.count}>{plural(view.total, text.count)}</p>
      <p role="status" className={styles.count}>
        {view.searching ? plural(view.matches, text.results) : ''}
      </p>
    </div>
  )
}
