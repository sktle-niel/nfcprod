import { copy } from '@/config/copy'
import { IconBack, IconForward } from '@/shared/ui/icons'
import { pageItems, type Paged } from './paging'
import styles from './Pagination.module.css'

const text = copy.admin.pagination

type Props = {
  paged: Pick<Paged<unknown>, 'page' | 'pageCount' | 'from' | 'to' | 'total'>
  onChange: (page: number) => void
  /** Previous, the range and next, with no page numbers. For narrow lists. */
  compact?: boolean
}

type StepProps = {
  direction: 'previous' | 'next'
  disabled: boolean
  onClick: () => void
}

function Step({ direction, disabled, onClick }: StepProps) {
  return (
    <button type="button" className={styles.button} aria-label={text[direction]} disabled={disabled} onClick={onClick}>
      {direction === 'previous' ? <IconBack size={18} /> : <IconForward size={18} />}
    </button>
  )
}

/** Moves through a long list. It is not there at all when everything fits on one page. */
export function Pagination({ paged, onChange, compact = false }: Props) {
  const { page, pageCount, from, to, total } = paged
  if (pageCount <= 1) return null

  const summary = text.summary.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(total))
  const previous = <Step direction="previous" disabled={page <= 1} onClick={() => onChange(page - 1)} />
  const next = <Step direction="next" disabled={page >= pageCount} onClick={() => onChange(page + 1)} />

  if (compact) {
    return (
      <nav className={styles.compact} aria-label={text.label}>
        {previous}
        <p className={styles.summary} aria-live="polite">
          {summary}
        </p>
        {next}
      </nav>
    )
  }

  return (
    <nav className={styles.full} aria-label={text.label}>
      <p className={styles.summary} aria-live="polite">
        {summary}
      </p>
      <ul className={styles.pages}>
        <li>{previous}</li>
        {/* Phones have no room for the numbers, so they get "2 / 6" instead. */}
        <li className={styles.position} aria-hidden="true">
          {text.position.replace('{page}', String(page)).replace('{count}', String(pageCount))}
        </li>
        {pageItems(page, pageCount).map((item, index) =>
          item === null ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item} className={styles.number}>
              <button
                type="button"
                className={styles.button}
                aria-label={text.page.replace('{n}', String(item))}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>{next}</li>
      </ul>
    </nav>
  )
}
