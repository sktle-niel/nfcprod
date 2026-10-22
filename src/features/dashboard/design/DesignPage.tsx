import { useRef, useState, type FormEvent } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Tab, TabList, TabPanel, Tabs } from '@/shared/ui/Tabs'
import { useOwnedBusiness } from '../dashboardData'
import { DetailsTab } from './DetailsTab'
import { LookTab } from './LookTab'
import { PreviewPanel } from './PreviewPanel'
import { SaveBar } from './SaveBar'
import { useDesignDraft, type TabName } from './useDesignDraft'
import { useFocusFirstError } from './useFocusFirstError'
import { usePreview } from './usePreview'
import styles from './DesignPage.module.css'

const text = dashboardCopy.design

/**
 * The Design page: the business's details and its look, edited as one draft with a live preview beside it. Nothing reaches
 * the business until Save, and Discard goes back to what is saved.
 */
export function DesignPage() {
  const { business, menu, actions } = useOwnedBusiness()
  const form = useDesignDraft(business, actions)
  const [tab, setTab] = useState<TabName>('details')
  const root = useRef<HTMLDivElement>(null)
  useFocusFirstError(form.focusAt, tab, setTab, root)
  const preview = usePreview(form.draft, business)

  // Save and Discard turn off once there is nothing to save, so the focus goes to the tab the owner is on.
  const focusTab = () => root.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await form.save()) focusTab()
  }

  const discard = () => {
    form.discard()
    focusTab()
  }

  const choose = (value: string) => {
    if (value === 'details' || value === 'look') setTab(value)
  }

  return (
    <div ref={root} className={styles.page}>
      <title>{text.title}</title>
      <PageHeader title={text.title} />
      <form className={styles.layout} onSubmit={(event) => void submit(event)} noValidate>
        <Tabs value={tab} onChange={choose}>
          <div className={styles.tabs}>
            <TabList label={text.tabsLabel}>
              <Tab value="details">{text.tabs.details}</Tab>
              <Tab value="look">{text.tabs.look}</Tab>
            </TabList>
          </div>
          <PreviewPanel className={styles.preview} business={preview} menu={menu} />
          <div className={styles.body}>
            <TabPanel value="details">
              <DetailsTab form={form} />
            </TabPanel>
            <TabPanel value="look">
              <LookTab form={form} preview={preview} menu={menu} />
            </TabPanel>
            <SaveBar dirty={form.dirty} busy={form.busy} uploading={form.uploading} status={form.status} notice={form.notice} onDiscard={discard} />
          </div>
        </Tabs>
      </form>
    </div>
  )
}
