import logoDark from '@/assets/brand/logo-dark.webp'
import logoLight from '@/assets/brand/logo-light.webp'
import styles from './Logo.module.css'

type Props = { className?: string | undefined }

// The full logo (card, waves and name). The height comes from --logo-height; the right version shows per theme.
export function Logo({ className }: Props) {
  return (
    <span className={className ? `${styles.logo} ${className}` : styles.logo}>
      <img className={styles.light} src={logoLight} width={700} height={146} alt="" decoding="async" />
      <img className={styles.dark} src={logoDark} width={700} height={144} alt="" decoding="async" />
    </span>
  )
}
