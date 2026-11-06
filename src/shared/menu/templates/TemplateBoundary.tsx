import { Component, type ReactNode } from 'react'
import { copy } from '@/config/copy'
import styles from '../MenuView.module.css'

const text = copy.menu.view.template

type Props = {
  /** The page to show instead: the menu must stay readable when a template cannot be drawn. */
  fallback: ReactNode
  /** False in the previews: nothing there may be a tab stop, so the words stand alone. */
  interactive: boolean
  children: ReactNode
}

type State = { failed: boolean }

/**
 * Catches a template that cannot be drawn, in practice a file that did not download (a lost connection, or a page left open across a
 * release). Without it the error would reach the route and take the whole page with it, the owner's unsaved Design work included. A
 * failed download stays failed until the page reloads (`lazy` keeps the error), so that is what the button does. Give it a `key` of
 * the template, so that choosing another one starts clean.
 */
export class TemplateBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  override render() {
    const { fallback, interactive, children } = this.props
    if (!this.state.failed) return children
    return (
      <>
        <div className={styles.templateFailed} role="alert">
          <p>{text.failed}</p>
          {interactive && (
            <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
              {text.reload}
            </button>
          )}
        </div>
        {fallback}
      </>
    )
  }
}
