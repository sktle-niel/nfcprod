import { createContext, useContext, useId, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

type TabsContext = { value: string; onChange: (value: string) => void; baseId: string }

const Context = createContext<TabsContext | null>(null)

function useTabs(): TabsContext {
  const context = useContext(Context)
  if (!context) throw new Error('Tab and TabPanel must sit inside Tabs')
  return context
}

const tabId = (baseId: string, value: string) => `${baseId}-tab-${value}`
const panelId = (baseId: string, value: string) => `${baseId}-panel-${value}`

/** Where a key sends the focus; -1 for a key that moves nothing. The ends wrap around. */
function targetIndex(key: string, current: number, last: number): number {
  if (key === 'ArrowRight') return current === last ? 0 : current + 1
  if (key === 'ArrowLeft') return current === 0 ? last : current - 1
  if (key === 'Home') return 0
  if (key === 'End') return last
  return -1
}

type TabsProps = { value: string; onChange: (value: string) => void; children: ReactNode }

/** Controlled tabs. The ids of the tabs and panels come from one useId, so two Tabs on a page never clash. */
export function Tabs({ value, onChange, children }: TabsProps) {
  const baseId = useId()
  return <Context value={{ value, onChange, baseId }}>{children}</Context>
}

type TabListProps = { label: string; children: ReactNode }

/** Arrow keys, Home and End move between the tabs and select the one they land on. */
export function TabList({ label, children }: TabListProps) {
  const { onChange } = useTabs()

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
    const current = tabs.findIndex((tab) => tab === document.activeElement)
    if (current < 0) return
    const last = tabs.length - 1
    const next = tabs[targetIndex(event.key, current, last)]
    if (!next) return
    event.preventDefault()
    next.focus()
    const value = next.dataset['value']
    if (value !== undefined) onChange(value)
  }

  return (
    <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}

type TabProps = { value: string; disabled?: boolean; children: ReactNode }

export function Tab({ value, disabled = false, children }: TabProps) {
  const context = useTabs()
  const selected = context.value === value
  return (
    <button
      type="button"
      role="tab"
      id={tabId(context.baseId, value)}
      data-value={value}
      className={styles.tab}
      aria-selected={selected}
      aria-controls={panelId(context.baseId, value)}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => context.onChange(value)}
    >
      {children}
    </button>
  )
}

type TabPanelProps = { value: string; children: ReactNode }

/** Stays mounted while hidden, so what the person typed in another tab is still there. */
export function TabPanel({ value, children }: TabPanelProps) {
  const context = useTabs()
  return (
    <div
      role="tabpanel"
      id={panelId(context.baseId, value)}
      aria-labelledby={tabId(context.baseId, value)}
      className={styles.panel}
      hidden={context.value !== value}
      tabIndex={0}
    >
      {children}
    </div>
  )
}
