import styles from './ScriptTitle.module.css'
import { splitFirstWord } from './splitFirstWord'
import type { TitleProps } from './types'

/**
 * "Iced" in the script font over "COFFEE" in bold capitals. Both parts sit in the one heading with a real space between
 * them, so it reads as "Iced Coffee". A one-word name is drawn in bold capitals only.
 */
export function ScriptTitle({ as: Heading, id, name }: TitleProps) {
  const [first, rest] = splitFirstWord(name)
  return (
    <Heading id={id} className={styles.title}>
      {rest === '' ? (
        <span className={styles.bold}>{first}</span>
      ) : (
        <>
          <span className={styles.script}>{first}</span> <span className={styles.bold}>{rest}</span>
        </>
      )}
    </Heading>
  )
}
