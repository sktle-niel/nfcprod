import { useSearchParams } from 'react-router-dom'
import { dashboardCopy } from '@/config/dashboardCopy'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Tab, TabList, TabPanel, Tabs } from '@/shared/ui/Tabs'
import { AddonsTab } from './addons/AddonsTab'
import { ItemsTab } from './items/ItemsTab'

const text = dashboardCopy.shell.menuPage

const TABS = ['items', 'addons'] as const
type TabName = (typeof TABS)[number]

function isTab(value: string | null): value is TabName {
  return TABS.some((tab) => tab === value)
}

/**
 * The Menu page: what the owner sells ("Items") and the choices that come with it ("Add-ons"). The tab is in the address
 * (`?tab=addons`), so a reload or a shared link lands on the same one.
 */
export function MenuPage() {
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: TabName = isTab(asked) ? asked : 'items'

  const choose = (next: string) => {
    if (!isTab(next)) return
    // Items is the default, so it keeps the address short.
    setParams(next === 'items' ? {} : { tab: next }, { replace: true })
  }

  return (
    <>
      <title>{text.title}</title>
      <PageHeader title={text.title} />
      <Tabs value={tab} onChange={choose}>
        <TabList label={text.tabs}>
          <Tab value="items">{text.items}</Tab>
          <Tab value="addons">{text.addons}</Tab>
        </TabList>
        <TabPanel value="items">
          <ItemsTab />
        </TabPanel>
        <TabPanel value="addons">
          <AddonsTab />
        </TabPanel>
      </Tabs>
    </>
  )
}
