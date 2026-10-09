import iconDark from '@/assets/brand/icon-dark.webp'
import iconLight from '@/assets/brand/icon-light.webp'
import styles from './BrandMark.module.css'

type Props = { className?: string | undefined }

// The logo icon (card + waves). The wrapper's height sets the size; the right version shows per theme.
export function BrandMark({ className }: Props) {
  return (
    <span className={className} aria-hidden="true">
      <img className={styles.light} src={iconLight} width={254} height={188} alt="" decoding="async" />
      <img className={styles.dark} src={iconDark} width={252} height={186} alt="" decoding="async" />
    </span>
  )
}
