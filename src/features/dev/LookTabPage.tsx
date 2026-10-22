import { useState } from 'react'
import type { BusinessPatch } from '@/entities/business/business'
import { styleTheme } from '@/entities/theme/styles'
import { STYLE_IDS, type Mode } from '@/entities/theme/theme'
import { LookTab } from '@/features/dashboard/design/LookTab'
import { LOOK_PARTS } from '@/features/dashboard/design/lookParts'
import { useDesignDraft } from '@/features/dashboard/design/useDesignDraft'
import { usePreview } from '@/features/dashboard/design/usePreview'
import { isOneOf } from '@/shared/lib/checks'
import { MenuPreviewFrame } from '@/shared/menu/MenuPreviewFrame'
import { sampleBusiness, sampleMenu } from '@/test/ownerFixtures'
import styles from './LookTabPage.module.css'

/**
 * A developer's page of the Design page's Look tab, with no sign-in, to look at the style picker and the controls in a real
 * browser (`/__look`, development server only). `?style=<id>` and `?mode=light|dark` start from a saved style, `?part=colors|cards|
 * headings|extras` opens a part, `?width=360` sets the width. Save keeps the change in this page only.
 */
export function LookTabPage() {
  const params = new URLSearchParams(window.location.search)
  const style = params.get('style')
  const mode: Mode = params.get('mode') === 'dark' ? 'dark' : 'light'
  const part = params.get('part')
  // Headless Chrome will not make a window narrower than about 500 px: `?width=360` narrows the page itself instead.
  const width = Number(params.get('width')) || undefined
  const [business, setBusiness] = useState(() =>
    sampleBusiness({ types: ['coffee', 'bakery'], ...(isOneOf(STYLE_IDS, style) ? { theme: styleTheme(style, mode) } : {}) }),
  )
  const [menu] = useState(() => sampleMenu())
  const form = useDesignDraft(business, {
    saveBusiness: async (patch: BusinessPatch) => setBusiness((current) => ({ ...current, ...patch })),
    uploadImage: async () => '',
  })
  const preview = usePreview(form.draft, business)

  return (
    <div className={styles.page} style={{ maxWidth: width }}>
      <div className={styles.form}>
        <LookTab form={form} preview={preview} menu={menu} firstPart={isOneOf(LOOK_PARTS, part) ? part : 'colors'} />
      </div>
      <div className={styles.preview}>
        <MenuPreviewFrame business={preview} menu={menu} />
      </div>
    </div>
  )
}
