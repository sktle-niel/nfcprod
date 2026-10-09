import styles from './CheckList.module.css'

type Props = { items: readonly string[] }

// Shared by the website package and the card bundles so every perk looks the same.
export function CheckList({ items }: Props) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" className={styles.check}>
            <circle cx="10" cy="10" r="10" fill="currentColor" />
            <path
              className={styles.tick}
              d="m5.8 10.4 2.7 2.7 5.7-6"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
