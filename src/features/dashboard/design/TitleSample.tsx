import { useId, useMemo, type CSSProperties } from 'react'
import { toCssVars } from '@/entities/theme/cssVars'
import type { Theme, TitleKind } from '@/entities/theme/theme'
import { lookOf, LookProvider } from '@/shared/menu/look'
import { TITLE_COMPONENTS } from '@/shared/menu/titles'
import styles from './TitleSample.module.css'

type Props = { kind: TitleKind; theme: Theme; name: string }

/**
 * A category title of one kind, drawn by the menu's own title component in the owner's colors and fonts, with `name` as
 * its text. It sits in an option that is already named, so the caller hides it from screen readers.
 */
export function TitleSample({ kind, theme, name }: Props) {
  const id = useId()
  const Title = TITLE_COMPONENTS[kind]
  const look = useMemo(() => lookOf({ ...theme, title: kind }), [theme, kind])
  return (
    // The variables come from toCssVars (checked values only) and the attribute is one of our own list values.
    <span className={styles.page} style={toCssVars(theme) as CSSProperties} data-menu-title={kind}>
      <LookProvider value={look}>
        <Title as="h3" id={id} name={name} />
      </LookProvider>
    </span>
  )
}
