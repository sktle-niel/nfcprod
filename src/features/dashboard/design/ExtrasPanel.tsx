import { useRef, type CSSProperties } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import type { BusinessType } from '@/entities/business/business'
import { toCssVars } from '@/entities/theme/cssVars'
import { DEFAULT_THEME, FONTS, LAYOUTS, type BackdropKind, type Font } from '@/entities/theme/theme'
import { useMenuFonts } from '@/shared/menu/fonts'
import { Panel } from '@/shared/ui/Panel'
import { ChoiceRadios } from './ChoiceRadios'
import { TextureGlyph } from './Glyph'
import { PagePhotoFields } from './PagePhotoFields'
import { StockPhotoFields } from './StockPhotoFields'
import type { DesignForm } from './useDesignDraft'
import choice from './ChoiceRadios.module.css'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

// The samples read the values from the theme's own tables, so a sample always matches what the menu will do.
const sampleVars = (patch: Partial<typeof DEFAULT_THEME>) => toCssVars({ ...DEFAULT_THEME, ...patch })

// A pairing is shown by its display face: the one names and titles are written in.
const fontStyle = (font: Font): CSSProperties => ({ fontFamily: sampleVars({ font })['--menu-display'] })

/** What the page behind the menu can be while the menu styles are redesigned: the page color alone, or a photo under a veil of it. */
const PAGE_BACKGROUNDS = ['plain', 'picture', 'stock'] as const satisfies readonly BackdropKind[]
type PageBackground = (typeof PAGE_BACKGROUNDS)[number]
// A texture of an older style is not drawn any more (`plainTheme`), so the page shows as the plain one.
const pageBackgroundOf = (backdrop: BackdropKind): PageBackground => (backdrop === 'picture' || backdrop === 'stock' ? backdrop : 'plain')

/** "Aa" in a pairing's display face, loaded on demand like the menu loads it. */
function FontSample({ font }: { font: Font }) {
  useMenuFonts({ font, title: 'plain', header: 'plain' })
  return <span style={fontStyle(font)}>{text.font.sample}</span>
}

type Props = {
  form: DesignForm
  /** The kinds of business, for the photo library to open on the photos that suit them. */
  types?: readonly BusinessType[] | undefined
}

/** What is left to set while the menu styles are redesigned: the page background (plain or a photo), the font and the menu layout. */
export function ExtrasPanel({ form, types }: Props) {
  const { theme } = form.draft
  const stack = useRef<HTMLDivElement>(null)
  const background = pageBackgroundOf(theme.backdrop)

  // Removing the library photo takes its picker off the page, and the focus with it: it goes back to the choice that opened it.
  const focusLibraryChoice = () => stack.current?.querySelector<HTMLInputElement>('input[type="radio"][value="stock"]')?.focus()

  return (
    <Panel title={text.extrasTitle}>
      <div ref={stack} className={styles.stack}>
        <ChoiceRadios
          legend={text.backdrop.legend}
          hint={text.backdrop.hint}
          value={background}
          onChange={(backdrop) => form.setChoice('backdrop', backdrop)}
          options={PAGE_BACKGROUNDS.map((backdrop) => ({
            value: backdrop,
            label: text.backdrop.options[backdrop],
            sample: <TextureGlyph kind={backdrop} />,
          }))}
        />
        {background === 'picture' && <PagePhotoFields form={form} />}
        {background === 'stock' && <StockPhotoFields form={form} types={types} onRemoved={focusLibraryChoice} />}
        <ChoiceRadios
          legend={text.font.legend}
          value={theme.font}
          onChange={(font) => form.setChoice('font', font)}
          options={FONTS.map((font) => ({
            value: font,
            label: text.font.options[font],
            sample: <FontSample font={font} />,
            labelStyle: fontStyle(font),
          }))}
        />
        <ChoiceRadios
          legend={text.layout.legend}
          hint={text.layout.hint}
          value={theme.layout}
          onChange={(layout) => form.setChoice('layout', layout)}
          options={LAYOUTS.map((layout) => ({
            value: layout,
            label: text.layout.options[layout],
            sample: (
              <span className={`${choice.glyph} ${layout === 'grid' ? choice.glyphGrid : choice.glyphList}`}>
                {Array.from({ length: layout === 'grid' ? 4 : 3 }, (_, index) => (
                  <span key={index} />
                ))}
              </span>
            ),
          }))}
        />
      </div>
    </Panel>
  )
}
