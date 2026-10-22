import { dashboardCopy } from '@/config/dashboardCopy'
import { CARDS, PHOTOS } from '@/entities/theme/theme'
import { Panel } from '@/shared/ui/Panel'
import { Switch } from '@/shared/ui/Switch'
import { ChoiceRadios } from './ChoiceRadios'
import { Glyph } from './Glyph'
import { CARD_GLYPHS, PHOTO_GLYPHS } from './glyphs'
import type { DesignForm } from './useDesignDraft'
import styles from './Form.module.css'

const text = dashboardCopy.design.look

/** How one product is drawn: the card, the shape of its picture, and a best seller shown big at the top. */
export function CardsPanel({ form }: { form: DesignForm }) {
  const { theme } = form.draft
  return (
    <Panel title={text.cardsTitle}>
      <div className={styles.stack}>
        <ChoiceRadios
          legend={text.card.legend}
          value={theme.card}
          onChange={(card) => form.setChoice('card', card)}
          options={CARDS.map((card) => ({ value: card, label: text.card.options[card], sample: <Glyph parts={CARD_GLYPHS[card]} /> }))}
        />
        <ChoiceRadios
          legend={text.photo.legend}
          // Said for the cut-out only, where it matters: a picture with a background shows as a box.
          hint={theme.photo === 'cutout' ? text.photo.cutoutHint : undefined}
          value={theme.photo}
          onChange={(photo) => form.setChoice('photo', photo)}
          options={PHOTOS.map((photo) => ({ value: photo, label: text.photo.options[photo], sample: <Glyph parts={PHOTO_GLYPHS[photo]} /> }))}
        />
        <Switch
          label={text.spotlight.label}
          description={text.spotlight.description}
          checked={theme.spotlight}
          onChange={(spotlight) => form.setChoice('spotlight', spotlight)}
        />
      </div>
    </Panel>
  )
}
