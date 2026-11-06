import { useId } from 'react'
import { pictureSrc } from '../../picture'
import type { MenuViewBusiness } from '../../MenuView'
import { HeaderLogo, motion } from '../kit'
import type { TemplateProps } from '../types'
import { arcLength, baselineOf, CENTER, dotArcs, fitStamp, linePath, type Line } from './stampFit'
import styles from './Stamp.module.css'

type Props = { business: MenuViewBusiness; as: TemplateProps['tags']['name']; interactive: boolean }

/** One line of lettering on its own arc, spaced to fill it exactly. */
function ArcLine({ line, place, id }: { line: Line; place: 'top' | 'bottom'; id: string }) {
  return (
    <>
      <path id={id} d={linePath(line, place)} fill="none" />
      <text className={styles.lettering} fontSize={line.size}>
        <textPath href={`#${id}`} textLength={arcLength(baselineOf(place, line.size), line.arc)} lengthAdjust="spacing">
          {line.text}
        </textPath>
      </text>
    </>
  )
}

const POINTS = [...Array(16).keys()]

/** Eight fine points, long and short in turn, around the center of the stamp. */
const starOf = (long: number, short: number) =>
  POINTS.map((point) => {
    const radius = point % 2 === 0 ? long : short
    const turn = (point * Math.PI) / 8
    return `${(CENTER + radius * Math.sin(turn)).toFixed(2)},${(CENTER - radius * Math.cos(turn)).toFixed(2)}`
  }).join(' ')

/** The neutral mark in the middle of a stamp with no logo: a printer's star in a ring of ticks, which says nothing about what the shop sells. */
function Mark() {
  return (
    <g className={styles.mark}>
      <polygon points={starOf(30, 6)} />
      {POINTS.map((point) => (
        <line key={point} className={styles.tick} x1={CENTER} x2={CENTER} y1={CENTER - 44} y2={CENTER - 52} transform={`rotate(${point * 22.5} ${CENTER} ${CENTER})`} />
      ))}
    </g>
  )
}

/**
 * The signature of the page: a fine round seal set from the real name, for a name of any length. The tagline stays out of the ring, in
 * words large enough to read, and a name too long for the ring joins it there. The drawing is hidden from readers, who get the heading
 * and the tagline as text. The seal settles in first and the words after it: the one composed moment of the page.
 */
export function Stamp({ business, as: Name, interactive }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const fit = fitStamp(business.name, '')
  const hasLogo = pictureSrc(business.logo) !== null
  const seal = interactive ? motion.opening : ''
  const words = interactive ? `${motion.opening} ${motion.afterOne}` : ''
  return (
    <div className={styles.head}>
      <div className={`${styles.stamp} ${seal}`}>
        <svg className={styles.drawing} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
          <circle className={styles.outer} cx={CENTER} cy={CENTER} r="114" />
          <circle className={styles.fine} cx={CENTER} cy={CENTER} r="109.5" />
          <circle className={styles.inner} cx={CENTER} cy={CENTER} r="67" />
          {fit.top !== null && <ArcLine line={fit.top} place="top" id={`${id}-top`} />}
          {fit.bottom !== null && <ArcLine line={fit.bottom} place="bottom" id={`${id}-bottom`} />}
          {dotArcs(fit).map((path) => (
            <path key={path} className={styles.dots} d={path} />
          ))}
          {!hasLogo && <Mark />}
        </svg>
        {hasLogo && (
          <span className={styles.logo}>
            <HeaderLogo logo={business.logo} />
          </span>
        )}
      </div>
      <Name className={fit.nameInRing ? styles.heard : `${styles.nameLine} ${words}`}>{business.name}</Name>
      {business.tagline !== '' && <p className={`${styles.taglineLine} ${words}`}>{business.tagline}</p>}
    </div>
  )
}
