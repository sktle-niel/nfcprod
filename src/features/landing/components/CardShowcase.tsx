import type { CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { showcaseOrder } from '../landing.data'
import { CardImage } from './CardImage'
import styles from './CardShowcase.module.css'

export function CardShowcase() {
  const { cards } = copy.landing
  return (
    <section id="cards" className={styles.section} aria-labelledby="cards-title">
      <h2 id="cards-title" className={`${styles.title} reveal`}>
        {cards.title}
      </h2>
      <p className={`${styles.body} reveal`} style={{ '--i': 1 } as CSSProperties}>{cards.body}</p>
      <ul className={styles.grid}>
        {showcaseOrder.map((card, i) => (
          <li key={card} className={`${styles.item} reveal`} style={{ '--i': i + 2 } as CSSProperties}>
            <CardImage card={card} className={styles.img} />
          </li>
        ))}
      </ul>
    </section>
  )
}
