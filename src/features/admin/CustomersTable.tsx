import { copy } from '@/config/copy'
import { formatPeso } from '@/shared/lib/money'
import type { Customer } from './customers'
import styles from './CustomersTable.module.css'
import { formatDay, formatMobile } from './format'
import { Block, Pulse } from './Skeleton'

const text = copy.admin.customers
const columns = text.columns

/** Stand-ins for `rows` customers, while the orders load. */
export function CustomersTableSkeleton({ rows }: { rows: number }) {
  return (
    <Pulse>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <Block width="34%" height={16} />
          <Block width="22%" height={14} />
          <Block width="14%" height={14} />
        </div>
      ))}
    </Pulse>
  )
}

function orderCount(count: number): string {
  return count === 1 ? text.orderOne : text.orderMany.replace('{n}', String(count))
}

// On phones the CSS turns each row into a block of lines. Some browsers then stop treating the
// table as a table, so the roles are spelled out.
export function CustomersTable({ customers }: { customers: readonly Customer[] }) {
  return (
    <table className={styles.table} role="table" aria-label={text.title}>
      <thead className={styles.head} role="rowgroup">
        <tr role="row">
          <th role="columnheader" scope="col">
            {columns.name}
          </th>
          <th role="columnheader" scope="col">
            {columns.mobile}
          </th>
          <th role="columnheader" scope="col">
            {columns.place}
          </th>
          <th role="columnheader" scope="col">
            {columns.orders}
          </th>
          <th role="columnheader" scope="col">
            {columns.spent}
          </th>
          <th role="columnheader" scope="col">
            {columns.last}
          </th>
        </tr>
      </thead>
      <tbody className={styles.body} role="rowgroup">
        {customers.map((customer) => (
          <tr key={customer.phone} className={styles.row} role="row">
            <th className={styles.name} role="rowheader" scope="row">
              {customer.name}
            </th>
            <td className={styles.phone} role="cell">
              <a href={`tel:${customer.phone}`}>{formatMobile(customer.phone)}</a>
            </td>
            <td className={styles.place} role="cell">
              {customer.city}, {customer.province}
            </td>
            <td className={styles.orders} role="cell">
              {orderCount(customer.orders)}
            </td>
            <td className={styles.spent} role="cell">
              {formatPeso(customer.spent)}
            </td>
            <td className={styles.last} role="cell">
              {formatDay(customer.last)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
