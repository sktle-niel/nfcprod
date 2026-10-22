import { isHexColor, mixHex, normalizeHex } from './color'
import { DEFAULT_THEME, type BackdropKind, type Veil } from './theme'

/*
 * The drawn page textures: every backdrop beyond the classic five is an image our own code draws from the owner's palette
 * (inline SVG data URLs and CSS gradients — ideas from references, never a copied file). Pure functions of the palette, so
 * the same theme always produces the same string. The page color itself stays the CSS background-color; a texture only
 * lays a faint share of the ink (the text color) or of the accent over it, and declares a ceiling for that share so the
 * contrast audit (menuChrome.style.test.ts) can prove the text still reads at its worst point.
 */

/** The 13 drawn textures, in picker order. The classic five ('plain' … 'glow') keep their CSS-only implementation. */
export const NEW_BACKDROPS = [
  'grain',
  'plaster',
  'marble',
  'linen',
  'weave',
  'terrazzo',
  'waves',
  'arches',
  'deco',
  'gingham',
  'check',
  'topo',
  'bloom',
] as const satisfies readonly BackdropKind[]
export type NewBackdropKind = (typeof NEW_BACKDROPS)[number]

export type BackdropLayers = {
  /** The CSS background-image value: url("data:image/svg+xml,...") parts and/or gradients, comma-joined. Null = plain. */
  image: string | null
  /** Ceilings for contrast math: the largest fraction of ink (text color) and of accent that the texture ever
      composites over the page anywhere, overlaps included, rounded up with margin. */
  inkShare: number
  accentShare: number
}

/** The tile size per kind, for the CSS background-size cross-check. 'full' covers the page once; 'auto' keeps the gradient's own period. */
export const BACKDROP_TILES: Record<NewBackdropKind, { width: number; height: number } | 'full' | 'auto'> = {
  grain: { width: 120, height: 120 },
  plaster: { width: 420, height: 420 },
  marble: { width: 460, height: 460 },
  linen: { width: 48, height: 48 },
  weave: { width: 60, height: 60 },
  terrazzo: { width: 220, height: 220 },
  waves: { width: 52, height: 26 },
  arches: { width: 64, height: 32 },
  deco: { width: 96, height: 48 },
  gingham: 'auto',
  check: { width: 36, height: 36 },
  topo: { width: 420, height: 420 },
  bloom: 'full',
}

/** The palette a texture is drawn from. Already validated by toCssVars, but re-checked here (defense in depth). */
type Palette = { background: string; text: string; accent: string }

function colorOr(value: unknown, fallback: string): string {
  return isHexColor(value) ? normalizeHex(value) : fallback
}

/** A `#rrggbb` color with an alpha channel, for the gradient recipes. */
const withAlpha = (hex: string, alpha: number): string => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`

/**
 * An SVG tile as a CSS image. The markup is fixed template strings, re-checked colors and fixed numbers only; the encoding
 * cannot escape the double-quoted url() wrapper (a quote becomes %22). No scripts, no event attributes, no href, no
 * foreignObject; every url() inside the markup is a local #fragment (filters and clips).
 */
const svgUrl = (width: number, height: number, inner: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${inner}</svg>`,
  )}")`

/** Deterministic pseudo-random for scatter patterns (no Math.random: the same theme must always draw the same texture). */
function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

/*
 * The recipes. Constants were tuned by eye in the prototype; each carries the derivation of its declared ceiling.
 * Where layers can overlap, the ceiling accounts for stacked alpha: 1-(1-a)(1-b). Opacity on a <g> is group opacity —
 * children composite first, then the one factor applies — so overlaps inside such a group never stack.
 */

/** Fine paper grain. One rect at opacity 0.2; the noise alpha (0.55·(r+g+b)−0.62) reaches 1, so the ceiling is 0.20. */
function grain({ text }: Palette): string {
  const inner =
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0.55 0.55 0 -0.62"/></filter>' +
    `<rect width="120" height="120" filter="url(#n)" fill="${text}" opacity="0.2"/>`
  return svgUrl(120, 120, inner)
}

/** Soft plaster clouds. One rect at opacity 0.10 (the matrix caps the noise alpha at 0.72, so the true share is under 0.072). */
function plaster({ text }: Palette): string {
  const inner =
    '<filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="11" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.18"/></filter>' +
    `<rect width="420" height="420" filter="url(#p)" fill="${text}" opacity="0.10"/>`
  return svgUrl(420, 420, inner)
}

/**
 * Marble: clouds plus displaced veins. Each vein is its own path at 0.09, so crossings stack: vein 4 crosses vein 1, and
 * veins 2 and 6 branch off veins 1 and 5, so two veins can sit on one point, over the cloud rect at 0.07:
 * 1−(1−0.09)²·(1−0.07) = 0.230 → 0.23. (Three veins never meet in the drawn geometry; the displacement moves all of them
 * by the same field, so it creates no new meeting points.)
 */
function marble({ text }: Palette): string {
  const vein = (d: string): string => `<path d="${d}" fill="none" stroke="${text}" stroke-width="1" opacity="0.09" filter="url(#dis)"/>`
  const inner =
    '<filter id="cl"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="4" stitchTiles="stitch"/>' +
    '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0 0 0 -0.14"/></filter>' +
    '<filter id="dis"><feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="9" stitchTiles="stitch" result="t"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="t" scale="18"/></filter>' +
    `<rect width="460" height="460" filter="url(#cl)" fill="${text}" opacity="0.07"/>` +
    vein('M-20 70 C 90 55, 150 120, 250 105 S 400 140, 490 120') +
    vein('M150 98 C 200 130, 230 190, 225 250') +
    vein('M-20 290 C 80 315, 180 265, 290 300 S 430 345, 490 320') +
    vein('M100 -20 C 118 70, 82 160, 120 250 S 135 390, 120 480') +
    vein('M350 -20 C 330 60, 372 140, 345 230 S 320 380, 340 480') +
    vein('M345 230 C 300 270, 260 280, 210 270')
  return svgUrl(460, 460, inner)
}

/**
 * Linen threads. Per-line opacity, so only crossings stack: a warp (≤0.075) over a weft (≤0.06) is
 * 1−(1−0.075)(1−0.06) = 0.131 → 0.14. Parallel threads sit 3px apart with 0.7px strokes; the whole displacement is only
 * ±1.2px and its differential over 3px is far below the 2.3px that would merge two of them.
 */
function linen({ text }: Palette): string {
  const inner =
    '<filter id="w"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="1" seed="3" stitchTiles="stitch" result="t"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="t" scale="2.4"/></filter>' +
    `<g filter="url(#w)" stroke="${text}" stroke-width="0.7">` +
    Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 3 + 1}" x2="48" y2="${i * 3 + 1}" opacity="${i % 2 ? 0.075 : 0.05}"/>`).join('') +
    Array.from({ length: 16 }, (_, i) => `<line x1="${i * 3 + 1}" y1="0" x2="${i * 3 + 1}" y2="48" opacity="${i % 2 ? 0.06 : 0.04}"/>`).join('') +
    '</g>'
  return svgUrl(48, 48, inner)
}

/**
 * Banig basket weave: two passes of offset rounded strips per cell. In a horizontal cell the two rects overlap in a
 * 2.8px band: 1−(1−0.038)(1−0.028) = 0.065 → 0.07. Cells stay inside their own 20px square, so nothing else meets.
 */
function weave({ text }: Palette): string {
  let basket = ''
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const h = (r + c) % 2 === 0
      const x = c * 20
      const y = r * 20
      basket +=
        `<rect x="${x + 1.1}" y="${y + (h ? 6.1 : 1.1)}" width="${h ? 17.8 : 7.8}" height="${h ? 7.8 : 17.8}" rx="1.6" fill="${text}" opacity="0.038"/>` +
        `<rect x="${x + (h ? 1.1 : 11.1)}" y="${y + (h ? 11.1 : 1.1)}" width="${h ? 17.8 : 7.8}" height="${h ? 7.8 : 17.8}" rx="1.6" fill="${text}" opacity="0.028"/>`
    }
  return svgUrl(60, 60, basket)
}

/**
 * Terrazzo chips: ink tones with a pinch of accent. The 26 chips rng(42) scatters are pairwise disjoint (the nearest pair
 * is 3px apart, and the tile clips without wrapping), so the ceilings are the single-chip opacities: ink 0.10, accent 0.16.
 */
function terrazzo({ text, accent }: Palette): string {
  const rand = rng(42)
  let chips = ''
  for (let i = 0; i < 26; i++) {
    const cx = rand() * 220
    const cy = rand() * 220
    const size = 2.5 + rand() * 6
    const sides = 3 + Math.floor(rand() * 3)
    const start = rand() * Math.PI * 2
    const pts = Array.from({ length: sides }, (_, k) => {
      const a = start + (k / sides) * Math.PI * 2 + rand() * 0.5
      const rr = size * (0.7 + rand() * 0.5)
      return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
    }).join(' ')
    const tone = i % 5 === 0 ? accent : text
    const op = i % 5 === 0 ? 0.16 : i % 2 ? 0.1 : 0.065
    chips += `<polygon points="${pts}" fill="${tone}" opacity="${op}"/>`
  }
  return svgUrl(220, 220, chips)
}

/**
 * Seigaiha waves. Per-circle opacity, and the arcs meet at the fans' shared joints: at a point such as (26,26) the two
 * tangent outer circles (0.065 each) and two inner r13 circles (0.048 each) all pass:
 * 1−(1−0.065)²·(1−0.048)² = 0.208 → 0.21.
 */
function waves({ text }: Palette): string {
  const fan = (cx: number, cy: number): string =>
    [26, 19.5, 13, 6.5]
      .map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${text}" stroke-width="1" opacity="${i === 0 ? 0.065 : 0.048}"/>`)
      .join('')
  const inner =
    '<defs><clipPath id="t"><rect width="52" height="26"/></clipPath></defs><g clip-path="url(#t)">' +
    fan(0, 26) +
    fan(52, 26) +
    fan(26, 39) +
    fan(-26, 39) +
    fan(78, 39) +
    fan(26, 13) +
    fan(-26, 13) +
    fan(78, 13) +
    fan(0, 0) +
    fan(52, 0) +
    '</g>'
  return svgUrl(52, 26, inner)
}

/** Scallop shell rows. Opacity sits on the group, so overlapping shells composite before it applies: exactly 0.05. */
function arches({ text }: Palette): string {
  const shell = (cx: number, cy: number): string => {
    const ribs = [-30, -15, 0, 15, 30]
      .map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180
        return `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * 15}" y2="${cy + Math.sin(a) * 15}"/>`
      })
      .join('')
    return `<path d="M ${cx - 16} ${cy} A 16 16 0 0 1 ${cx + 16} ${cy}" fill="none"/>` + ribs
  }
  const inner =
    '<defs><clipPath id="t"><rect width="64" height="32"/></clipPath></defs>' +
    `<g clip-path="url(#t)" stroke="${text}" stroke-width="0.8" opacity="0.05" fill="none">` +
    shell(16, 32) +
    shell(48, 32) +
    shell(80, 32) +
    shell(-16, 32) +
    shell(32, 16) +
    shell(0, 16) +
    shell(64, 16) +
    shell(16, 0) +
    shell(48, 0) +
    '</g>'
  return svgUrl(64, 32, inner)
}

/** Art-deco fans in the accent. Group opacity again: crossing rows flatten inside the group, then 0.13 applies once. */
function deco({ accent }: Palette): string {
  const fan = (cx: number, cy: number): string => {
    const arcs = [24, 18, 12, 6].map((r) => `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"/>`).join('')
    const ribs = [-54, -18, 18, 54]
      .map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180
        return `<line x1="${cx + Math.cos(a) * 6}" y1="${cy + Math.sin(a) * 6}" x2="${cx + Math.cos(a) * 24}" y2="${cy + Math.sin(a) * 24}"/>`
      })
      .join('')
    return arcs + ribs
  }
  const inner =
    '<defs><clipPath id="t"><rect width="96" height="48"/></clipPath></defs>' +
    `<g clip-path="url(#t)" stroke="${accent}" stroke-width="0.9" opacity="0.13" fill="none">` +
    fan(24, 48) +
    fan(72, 48) +
    fan(120, 48) +
    fan(-24, 48) +
    fan(48, 24) +
    fan(0, 24) +
    fan(96, 24) +
    fan(24, 0) +
    fan(72, 0) +
    '</g>'
  return svgUrl(96, 48, inner)
}

/** Soft gingham, pure gradients. The two layers of 0.05 cross: 1−(1−0.05)² = 0.098 → 0.10. */
function gingham({ text }: Palette): string {
  const band = withAlpha(text, 0.05)
  return `repeating-linear-gradient(0deg, ${band} 0 12px, transparent 12px 28px), repeating-linear-gradient(90deg, ${band} 0 12px, transparent 12px 28px)`
}

/** Faint checkerboard, one conic layer: 0.05. */
function check({ text }: Palette): string {
  return `repeating-conic-gradient(${withAlpha(text, 0.05)} 0 25%, transparent 0 50%)`
}

/** Topographic contours. Group opacity 0.085 caps even the displaced rings that cross: → 0.09. */
function topo({ text }: Palette): string {
  const loop = (cx: number, cy: number, radii: number[]): string =>
    radii.map((r) => `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.35}" ry="${r}" fill="none"/>`).join('')
  const inner =
    '<filter id="d"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="5" stitchTiles="stitch" result="t"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="t" scale="34"/></filter>' +
    `<g filter="url(#d)" stroke="${text}" stroke-width="1" opacity="0.085" fill="none">` +
    loop(100, 80, [14, 30, 46, 62]) +
    loop(315, 230, [12, 26, 40, 54, 68]) +
    loop(80, 320, [10, 22, 34, 46]) +
    loop(340, 50, [10, 22, 34]) +
    loop(210, 400, [10, 22, 34]) +
    loop(15, 190, [9, 20, 31]) +
    '</g>'
  return svgUrl(420, 420, inner)
}

/**
 * Bloom: three soft accent auras, no-repeat over the whole page. Each fades out at 70–75% of its radius and their nonzero
 * regions never meet (the first ends at x≈41% of the page, the second starts at x≈59%, the third below y≈67%), so the
 * ceiling is the strongest aura alone: 0.16.
 */
function bloom({ accent }: Palette): string {
  const soft = (alpha: number): string => withAlpha(accent, alpha)
  return `radial-gradient(42% 34% at 12% 6%, ${soft(0.16)}, transparent 70%), radial-gradient(50% 40% at 95% 30%, ${soft(0.11)}, transparent 72%), radial-gradient(56% 44% at 30% 100%, ${soft(0.09)}, transparent 75%)`
}

const TEXTURES: Record<NewBackdropKind, { draw: (palette: Palette) => string; inkShare: number; accentShare: number }> = {
  grain: { draw: grain, inkShare: 0.2, accentShare: 0 },
  plaster: { draw: plaster, inkShare: 0.1, accentShare: 0 },
  marble: { draw: marble, inkShare: 0.23, accentShare: 0 },
  linen: { draw: linen, inkShare: 0.14, accentShare: 0 },
  weave: { draw: weave, inkShare: 0.07, accentShare: 0 },
  terrazzo: { draw: terrazzo, inkShare: 0.1, accentShare: 0.16 },
  waves: { draw: waves, inkShare: 0.21, accentShare: 0 },
  arches: { draw: arches, inkShare: 0.05, accentShare: 0 },
  deco: { draw: deco, inkShare: 0, accentShare: 0.13 },
  gingham: { draw: gingham, inkShare: 0.1, accentShare: 0 },
  check: { draw: check, inkShare: 0.05, accentShare: 0 },
  topo: { draw: topo, inkShare: 0.09, accentShare: 0 },
  bloom: { draw: bloom, inkShare: 0, accentShare: 0.16 },
}

function isNewBackdrop(backdrop: BackdropKind): backdrop is NewBackdropKind {
  return (NEW_BACKDROPS as readonly BackdropKind[]).includes(backdrop)
}

/**
 * The worst share of the photo that shows through each veil; the page color covers the rest. The contrast math and the
 * audit (menuChrome.style.test.ts) hold the page text to 4.5:1 on the page moved toward black and toward white by this
 * share — any photo pixel under the veil lands between those two grounds. 'strong' stays at the ceiling of the boldest
 * drawn texture (marble, 0.23), so a photo is never louder than the textures the palettes are already proven against.
 */
export const PICTURE_SHARES: Record<Veil, number> = { faint: 0.1, soft: 0.16, strong: 0.23 }

/**
 * The two worst grounds a veiled photo can put under the page text: the page moved toward black and toward white by the
 * veil's share. Any photo pixel under the veil lands between them. One function, so the engine (toCssVars), the editor's
 * warning (themeIssues) and its fix (contrastFix) can never disagree about what "worst" means.
 */
export function photoGrounds(background: string, veil: Veil): [string, string] {
  const page = colorOr(background, DEFAULT_THEME.background)
  const share = PICTURE_SHARES[veil]
  return [mixHex(page, '#000000', share) ?? page, mixHex(page, '#ffffff', share) ?? page]
}

/**
 * The CSS image of a photo backdrop: the owner's picture under a flat veil of the page color at 1 - share, so no pixel
 * ever shows through by more than the declared share. `src` must already be a checked, CSS-safe address (toCssVars does
 * both checks); the page color is re-checked here like the palette above.
 */
export function pictureBackdropImage(src: string, background: string, veil: Veil): string {
  const page = colorOr(background, DEFAULT_THEME.background)
  const cover = withAlpha(page, 1 - PICTURE_SHARES[veil])
  return `linear-gradient(${cover}, ${cover}), url("${src}")`
}

/**
 * The texture of `backdrop`, drawn from `palette`. The classic five have no image here (their CSS draws them). The colors
 * are re-checked and fall back to the defaults, like toCssVars's own guard, so even a palette that skipped validation
 * cannot put anything but `#rrggbb` into the image.
 */
export function backdropLayers(backdrop: BackdropKind, palette: Palette): BackdropLayers {
  if (!isNewBackdrop(backdrop)) return { image: null, inkShare: 0, accentShare: 0 }
  const safe: Palette = {
    background: colorOr(palette.background, DEFAULT_THEME.background),
    text: colorOr(palette.text, DEFAULT_THEME.secondary),
    accent: colorOr(palette.accent, DEFAULT_THEME.primary),
  }
  const { draw, inkShare, accentShare } = TEXTURES[backdrop]
  return { image: draw(safe), inkShare, accentShare }
}
