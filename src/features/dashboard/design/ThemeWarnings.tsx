import { dashboardCopy } from '@/config/dashboardCopy'
import { isHexColor } from '@/entities/theme/color'
import type { Theme } from '@/entities/theme/theme'
import { themeIssues } from '@/entities/theme/validate'
import { fill } from '@/shared/lib/fill'
import { Button } from '@/shared/ui/Button'
import { IconWarning } from '@/shared/ui/icons'
import ui from '@/shared/ui/ui.module.css'
import { contrastFix, type ContrastFix } from './contrastFix'
import styles from './ThemeWarnings.module.css'

const text = dashboardCopy.design.look

type Props = {
  theme: Theme
  onFix: (fix: ContrastFix) => void
}

/**
 * Warnings about colors that are hard to read, each with a button that applies a fix. They never block saving. Nothing is
 * said while a color is half typed, because a color that is not `#rrggbb` has no contrast to measure.
 *
 * Screen readers hear one fixed sentence for each warning, in a status region that is always in the page. It changes only
 * when a warning appears or goes away, never while a color is dragged. The list on screen, with its fix colors, sits
 * outside the region.
 */
export function ThemeWarnings({ theme, onFix }: Props) {
  const measurable = isHexColor(theme.primary) && isHexColor(theme.secondary) && isHexColor(theme.background)
  const issues = measurable ? themeIssues(theme) : []

  return (
    <div className={styles.region}>
      <p role="status" className={ui.visuallyHidden}>
        {issues.map((issue) => text.announce[issue]).join(' ')}
      </p>
      {issues.length > 0 && (
        <ul className={styles.list}>
          {issues.map((issue) => {
            const fix = contrastFix(issue, theme)
            const label = fill(issue === 'textContrast' ? text.fixText : text.fixAccent, { color: fix.color })
            return (
              <li key={issue} className={styles.item}>
                <span className={styles.icon}>
                  <IconWarning size={20} />
                </span>
                <p className={styles.words}>{text.warnings[issue]}</p>
                <Button variant="secondary" size="sm" aria-label={label} onClick={() => onFix(fix)}>
                  {text.fix}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
