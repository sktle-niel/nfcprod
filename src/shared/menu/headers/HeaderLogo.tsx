import { pictureSrc } from '../picture'
import styles from './HeaderLogo.module.css'

type Props = { logo: string | null }

/**
 * The business logo, or nothing when there is none or its address is not one the page may show (`pictureSrc`). Its size and
 * corners come from the header around it (`--logo-size`, `--logo-radius`).
 */
export function HeaderLogo({ logo }: Props) {
  const src = pictureSrc(logo)
  return src === null ? null : <img className={styles.logo} src={src} alt="" width={72} height={72} decoding="async" />
}
