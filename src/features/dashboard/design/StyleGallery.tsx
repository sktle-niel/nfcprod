import { useId } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { Menu } from '@/entities/menu/menu'
import { STYLE_IDS, type Mode, type StyleId } from '@/entities/theme/theme'
import { bestForLine, styleName } from './styleWords'
import { StyleThumb } from './StyleThumb'
import type { ThumbBusiness } from './thumbs'
import styles from './StyleGallery.module.css'

const text = dashboardCopy.design.look.styles
type Props = {
  value: StyleId
  mode: Mode
  business: ThumbBusiness
  menu: Menu
  onChange: (id: StyleId) => void
}

/**
 * The thirteen styles as one radio group, each with a small live picture of the owner's menu in that style. Native radios:
 * the arrow keys move through the styles and a screen reader says the name, then what it is best for.
 */
export function StyleGallery({ value, mode, business, menu, onChange }: Props) {
  const name = useId()
  return (
    <fieldset className={styles.group} aria-describedby={`${name}-intro`}>
      <legend className={styles.legend}>{text.legend}</legend>
      <p id={`${name}-intro`} className={styles.intro}>
        {text.intro}
      </p>
      <div className={styles.grid}>
        {STYLE_IDS.map((id) => (
          <label key={id} className={styles.option}>
            <input
              type="radio"
              className={styles.input}
              name={name}
              value={id}
              checked={id === value}
              aria-labelledby={`${name}-${id}`}
              aria-describedby={`${name}-${id}-for`}
              onChange={() => onChange(id)}
            />
            <span className={styles.face}>
              <StyleThumb id={id} mode={mode} business={business} menu={menu} />
              <span className={styles.text}>
                <span id={`${name}-${id}`} className={styles.name}>
                  {styleName(id)}
                </span>
                <span id={`${name}-${id}-for`} className={styles.bestFor}>
                  {bestForLine(id)}
                </span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
