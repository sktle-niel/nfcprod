import type { BackdropKind } from '@/entities/theme/theme'
import type { Part } from './glyphs'
import styles from './Glyph.module.css'

/** A tiny drawing of a choice, made of plain shapes. It is decoration: the option's label names the choice. */
export function Glyph({ parts }: { parts: readonly Part[] }) {
  return (
    <span className={styles.glyph}>
      {parts.map(([shape, left, top, width, height], index) => (
        // The positions are our own numbers from glyphs.ts, never owner text.
        <span key={index} className={styles[shape]} style={{ left, top, width, height }} />
      ))}
    </span>
  )
}

/** A swatch of a page texture, drawn with the same kind of pattern the menu uses. */
export function TextureGlyph({ kind }: { kind: BackdropKind }) {
  return <span className={styles.texture} data-texture={kind} />
}
