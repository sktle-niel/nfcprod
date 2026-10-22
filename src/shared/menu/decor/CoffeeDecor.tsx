import { Bean, Line } from './Line'
import styles from './CoffeeDecor.module.css'

/** Hanging cafe lamps on three cords of different lengths. */
function Lamps() {
  return (
    <Line viewBox="0 0 120 84" className={styles.lamps}>
      <path d="M18 0v26M8 42c0-9 4-16 10-16s10 7 10 16zM15 42a3 3 0 0 0 6 0" />
      <path d="M58 0v10M48 30l5-20h10l5 20zM55 30a3 3 0 0 0 6 0" />
      <path d="M100 0v40M88 54a12 12 0 0 1 24 0zM97 54a3 3 0 0 0 6 0M100 62v4M92 60l-2 3M108 60l2 3" />
    </Line>
  )
}

/** A handful of roasted beans. */
function Beans({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 70 70" className={className}>
      <Bean x={22} y={22} a={-30} />
      <Bean x={50} y={32} a={25} />
      <Bean x={26} y={52} a={75} />
    </Line>
  )
}

/** A cup of coffee on its saucer, steaming. */
function Cup() {
  return (
    <Line viewBox="0 0 90 66" className={styles.cup}>
      <path d="M36 18c-3-4 3-6 0-11M46 18c-3-4 3-6 0-11" />
      <path d="M22 24h40v8a17 17 0 0 1-17 17h-6a17 17 0 0 1-17-17z" />
      <path d="M62 28h4a7 7 0 0 1 0 14h-6M12 54h64M14 54c6 6 54 6 60 0" />
    </Line>
  )
}

/** A stovetop moka pot. */
function Moka() {
  return (
    <Line viewBox="0 0 70 90" className={styles.moka}>
      <path d="M33 5h6M36 5v3M23 12c3-5 23-5 26 0" />
      <path d="M20 12h32l-6 30H26zM36 12v30M20 12l-7-3" />
      <path d="M52 16h7c3 0 4 3 3 5l-9 18" />
      <path d="M25 42h22v5H25zM26 47l-8 35h36l-8-35M36 47v35" />
    </Line>
  )
}

/** The coffee set: lamps over the header, beans in the corners, a cup and a moka pot at the foot of the menu. */
export function CoffeeDecor() {
  return (
    <>
      <Beans className={styles.beansTop} />
      <Lamps />
      <Cup />
      <Moka />
      <Beans className={styles.beansFoot} />
    </>
  )
}
