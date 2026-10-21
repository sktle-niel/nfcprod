import { Fragment } from 'react'
import { MAP_CREDITS } from '@/config/map'
import styles from './PinMap.module.css'

/**
 * The credit in the corner of the map, always shown. Its words are fixed in our own code (`MAP_CREDITS`): nothing the
 * style or the tiles say is ever rendered. Every link opens in a new tab, so a stray tap does not leave the order form.
 */
export function MapCredits() {
  return (
    <p className={styles.credits}>
      {MAP_CREDITS.map((credit, index) => (
        <Fragment key={typeof credit === 'string' ? credit : credit.href}>
          {index > 0 && ' '}
          {typeof credit === 'string' ? (
            credit
          ) : (
            <a href={credit.href} target="_blank" rel="noopener noreferrer">
              {credit.text}
            </a>
          )}
        </Fragment>
      ))}
    </p>
  )
}
