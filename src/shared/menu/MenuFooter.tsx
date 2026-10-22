import { copy } from '@/config/copy'
import type { Business } from '@/entities/business/business'
import { LINK_MAX, SOCIAL_NETWORKS } from '@/entities/business/social'
import { parseHttpsUrl } from '@/shared/lib/url'
import styles from './MenuView.module.css'

const text = copy.menu.view

type Props = { business: Pick<Business, 'phone' | 'address' | 'hours' | 'social'>; interactive?: boolean }

/** A phone number as a dial link: digits and a leading plus only. Null when there is nothing to dial. */
function dialHref(phone: string): string | null {
  const dial = phone.replace(/[^\d+]/g, '')
  return /\d/.test(dial) ? `tel:${dial}` : null
}

export function MenuFooter({ business, interactive = true }: Props) {
  const dial = dialHref(business.phone)
  // The component does not trust its input: a link that is not a clean https link is not drawn.
  const links = SOCIAL_NETWORKS.flatMap((network) => {
    const url = parseHttpsUrl(business.social[network], LINK_MAX)
    return url ? [{ network, href: url.href }] : []
  })
  if (business.phone.trim() === '' && business.address === '' && business.hours === '' && links.length === 0) return null
  return (
    <footer className={styles.footer}>
      {business.phone.trim() !== '' && (
        <div className={styles.fact}>
          <p className={styles.factTitle}>{text.footer.phone}</p>
          {dial && interactive ? (
            <a className={styles.link} href={dial}>
              {business.phone}
            </a>
          ) : (
            <p className={styles.factText}>{business.phone}</p>
          )}
        </div>
      )}
      {business.address !== '' && (
        <div className={styles.fact}>
          <p className={styles.factTitle}>{text.footer.address}</p>
          <p className={styles.factText}>{business.address}</p>
        </div>
      )}
      {business.hours !== '' && (
        <div className={styles.fact}>
          <p className={styles.factTitle}>{text.footer.hours}</p>
          <p className={`${styles.factText} ${styles.hours}`}>{business.hours}</p>
        </div>
      )}
      {links.length > 0 && (
        <div className={styles.fact}>
          <p className={styles.factTitle}>{text.footer.social}</p>
          <ul className={styles.social}>
            {links.map(({ network, href }) => (
              <li key={network}>
                {interactive ? (
                  <a className={styles.link} href={href} target="_blank" rel="noopener noreferrer">
                    {text.social[network]}
                  </a>
                ) : (
                  <span className={styles.linkPlain}>{text.social[network]}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </footer>
  )
}
