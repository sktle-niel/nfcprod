import type { CSSProperties } from 'react'
import { dashboardCopy } from '@/config/dashboardCopy'
import { NEW_BACKDROPS, type NewBackdropKind } from '@/entities/theme/backdrop'
import { toCssVars } from '@/entities/theme/cssVars'
import { BACKDROPS, BUTTON_STYLES, DECORS, DEFAULT_THEME, FONTS, LAYOUTS, type BackdropKind, type Font } from '@/entities/theme/theme'
import { useMenuFonts } from '@/shared/menu/fonts'
import { Panel } from '@/shared/ui/Panel'
import { ChoiceRadios } from './ChoiceRadios'
import { TextureGlyph } from './Glyph'
import { TextureSwatch } from './TextureSwatch'
import type { DesignForm } from './useDesignDraft'
import choice from './ChoiceRadios.module.css'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

// The samples read the values from the theme's own tables, so a sample always matches what the menu will do.
const sampleVars = (patch: Partial<typeof DEFAULT_THEME>) => toCssVars({ ...DEFAULT_THEME, ...patch })

// A pairing is shown by its display face: the one names and titles are written in.
const fontStyle = (font: Font): CSSProperties => ({ fontFamily: sampleVars({ font })['--menu-display'] })

/** The drawn textures get a live swatch; the classic five keep their CSS drawing (`TextureGlyph`). */
const isDrawnBackdrop = (backdrop: BackdropKind): backdrop is NewBackdropKind =>
  (NEW_BACKDROPS as readonly BackdropKind[]).includes(backdrop)

/** "Aa" in a pairing's display face, loaded on demand like the menu loads it. */
function FontSample({ font }: { font: Font }) {
  useMenuFonts({ font, title: 'plain', header: 'plain' })
  return <span style={fontStyle(font)}>{text.font.sample}</span>
}

/** The finishing touches: line art, page texture, font, corners and layout. */
export function ExtrasPanel({ form }: { form: DesignForm }) {
  const { theme } = form.draft

  return (
    <Panel title={text.extrasTitle}>
      <div className={styles.stack}>
        <ChoiceRadios
          legend={text.decor.legend}
          hint={text.decor.hint}
          value={theme.decor}
          onChange={(decor) => form.setChoice('decor', decor)}
          options={DECORS.map((decor) => ({ value: decor, label: text.decor.options[decor] }))}
        />
        <ChoiceRadios
          legend={text.backdrop.legend}
          hint={text.backdrop.hint}
          value={theme.backdrop}
          onChange={(backdrop) => form.setChoice('backdrop', backdrop)}
          options={BACKDROPS.map((backdrop) => ({
            value: backdrop,
            label: text.backdrop.options[backdrop],
            // The drawn textures show their real image in the draft's own colors; the classic five keep their CSS drawing.
            sample: isDrawnBackdrop(backdrop) ? <TextureSwatch kind={backdrop} theme={theme} /> : <TextureGlyph kind={backdrop} />,
          }))}
        />
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
          legend={text.buttonStyle.legend}
          hint={text.buttonStyle.hint}
          value={theme.buttonStyle}
          onChange={(style) => form.setChoice('buttonStyle', style)}
          options={BUTTON_STYLES.map((style) => ({
            value: style,
            label: text.buttonStyle.options[style],
            sample: (
              <span className={choice.button} style={{ borderRadius: sampleVars({ buttonStyle: style })['--menu-radius'] }}>
                {text.buttonStyle.sample}
              </span>
            ),
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
