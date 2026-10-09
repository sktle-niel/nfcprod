import type { CSSProperties } from 'react'
import { copy } from '@/config/copy'
import { CTA_HREF } from '../landing.data'
import { CardImage } from './CardImage'
import { BrandMark } from './BrandMark'
import { PhoneMenu } from './PhoneMenu'
import styles from './Scene.module.css'

const index = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * Hero + "how it works" as one scroll-driven scene.
 * Act 1 (hero) pulls back and fades out while act 2 fades in; the phone stays on screen and travels.
 * Browsers without scroll-driven animations (or with reduced motion) get the same content as plain stacked sections.
 */
export function Scene() {
  const { hero, how } = copy.landing
  return (
    <section className={styles.track}>
      <div className={styles.stage}>
        <div className={styles.frame}>
          <h1 className={styles.title} style={index(0)}>
            <span className={styles.line1}>{hero.line1}</span>{' '}
            <span className={styles.line2}>
              <BrandMark className={styles.badge} />
              <em className={styles.accent}>{hero.accent}</em>
            </span>
          </h1>

          <div className={styles.visual} style={index(2)}>
            <svg className={styles.loop} viewBox="0 0 600 360" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path
                d="M -10 300 C 60 360, 300 385, 430 335 C 560 285, 650 200, 565 120 C 505 62, 410 22, 330 42"
                stroke="var(--color-accent-soft)"
                strokeWidth="8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className={styles.phonePos}>
              <div className={styles.phoneRig}>
                <PhoneMenu />
              </div>
            </div>
            <div className={`${styles.card} ${styles.cardBack}`}>
              <div className={styles.cardExit}>
                <div className={styles.float}>
                  <CardImage card="facebook" className={styles.cardImg} eager />
                </div>
              </div>
            </div>
            <div className={`${styles.card} ${styles.cardFront}`}>
              <div className={styles.cardExit}>
                <div className={styles.float}>
                  <CardImage card="website" className={styles.cardImg} eager />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.side} style={index(3)}>
            <p>{hero.body}</p>
            <div className={styles.actions}>
              <a className={styles.primary} href={CTA_HREF}>
                {hero.cta}
              </a>
              <a className={styles.link} href="#how">
                {hero.secondary}
              </a>
            </div>
          </div>
        </div>
      </div>

      <span id="how" className={styles.anchor} />

      <div className={styles.act2}>
        <div className={styles.frame2}>
          <h2 className={styles.a2title}>
            <span className={styles.a2l1}>{how.title}</span>{' '}
            <em className={styles.a2l2}>{how.accent}</em>
          </h2>
          <ol className={styles.rows}>
            {how.steps.map((step, i) => (
              <li key={step.title} className={styles.row} style={index(i)}>
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.rowText}>
                  <strong>{step.title}</strong>
                  <small>{step.body}</small>
                </span>
              </li>
            ))}
          </ol>
          <BrandMark className={styles.pop} />
        </div>
      </div>
    </section>
  )
}
