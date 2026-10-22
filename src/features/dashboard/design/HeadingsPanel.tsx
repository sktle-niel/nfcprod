import { dashboardCopy } from '@/config/dashboardCopy'
import { HEADERS, TITLES } from '@/entities/theme/theme'
import { useMenuFonts } from '@/shared/menu/fonts'
import { Panel } from '@/shared/ui/Panel'
import { ChoiceRadios } from './ChoiceRadios'
import { Glyph } from './Glyph'
import { HEADER_GLYPHS } from './glyphs'
import { TitleSample } from './TitleSample'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

/** How category names and the top of the menu are drawn. Each title option writes its own name in its real look. */
export function HeadingsPanel({ form }: { form: DesignForm }) {
  const { theme } = form.draft
  // The Script title writes in the script face: load it for the sample, as the menu would.
  useMenuFonts({ font: theme.font, title: 'script', header: theme.header })

  return (
    <Panel title={text.headingsTitle}>
      <div className={styles.stack}>
        <ChoiceRadios
          legend={text.title.legend}
          wide
          value={theme.title}
          onChange={(title) => form.setChoice('title', title)}
          options={TITLES.map((title) => ({
            value: title,
            label: text.title.options[title],
            hideLabel: true,
            sample: <TitleSample kind={title} theme={theme} name={text.title.options[title]} />,
          }))}
        />
        <ChoiceRadios
          legend={text.header.legend}
          value={theme.header}
          onChange={(header) => form.setChoice('header', header)}
          options={HEADERS.map((header) => ({
            value: header,
            label: text.header.options[header],
            sample: <Glyph parts={HEADER_GLYPHS[header]} />,
          }))}
        />
      </div>
    </Panel>
  )
}
