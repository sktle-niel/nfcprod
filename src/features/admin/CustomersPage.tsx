import { useMemo, useRef, useState } from 'react'
import { copy } from '@/config/copy'
import { useAdminData } from './adminData'
import { customersOf, customerText } from './customers'
import { CustomersTable, CustomersTableSkeleton } from './CustomersTable'
import styles from './CustomersPage.module.css'
import { matchesQuery } from './filterOrders'
import { PageHeader } from './PageHeader'
import { Pagination } from './Pagination'
import { paginate, showTop } from './paging'
import { Panel } from './Panel'
import ui from './ui.module.css'

const text = copy.admin.customers
const PAGE_SIZE = 10

/** Everyone who ordered, once each, ten to a page, with how much they ordered. Made from the orders; cancelled ones do not count. */
export function CustomersPage() {
  const { loading, records } = useAdminData()
  const panelRef = useRef<HTMLElement>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const customers = useMemo(() => customersOf(records), [records])
  const shown = customers.filter((customer) => matchesQuery(customerText(customer), query))
  const paged = paginate(shown, page, PAGE_SIZE)

  function goTo(next: number) {
    setPage(next)
    showTop(panelRef.current)
  }

  return (
    <>
      <title>{text.title}</title>
      <PageHeader title={text.title}>
        <input
          type="search"
          className={`${ui.field} ${styles.search}`}
          value={query}
          placeholder={text.search}
          aria-label={text.search}
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
        />
      </PageHeader>

      <Panel ref={panelRef} className={styles.panel}>
        {loading ? (
          <CustomersTableSkeleton rows={PAGE_SIZE} />
        ) : paged.total === 0 ? (
          <p className={styles.none}>{text.none}</p>
        ) : (
          <>
            <CustomersTable customers={paged.rows} />
            <Pagination paged={paged} onChange={goTo} />
          </>
        )}
      </Panel>
    </>
  )
}
