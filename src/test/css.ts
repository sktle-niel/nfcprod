// Helpers for tests that check what a stylesheet promises. Vitest does not load CSS (`css: false`), so the files are read from
// disk, from the folder tests run in (the project root). The module name is a variable so that the app's type-check, which has
// no Node types, does not try to resolve it.

type Fs = {
  readdirSync(path: string, options: { withFileTypes: true; recursive: true }): { name: string; parentPath: string; isFile(): boolean }[]
  readFileSync(path: string, encoding: 'utf8'): string
}

async function fs(): Promise<Fs> {
  const node = 'node:fs'
  return (await import(/* @vite-ignore */ node)) as Fs
}

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** A stylesheet from the project root, such as 'src/shared/ui/Modal.module.css', with line ends normalized and comments out. */
export async function readCss(path: string): Promise<string> {
  const { readFileSync } = await fs()
  return withoutComments(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'))
}

/** Every stylesheet under src, comments out. */
export async function allCss(): Promise<{ path: string; css: string }[]> {
  const { readdirSync, readFileSync } = await fs()
  return readdirSync('src', { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => {
      const path = `${entry.parentPath}/${entry.name}`
      return { path, css: withoutComments(readFileSync(path, 'utf8').replace(/\r\n/g, '\n')) }
    })
}

/** The body of the first rule with exactly this selector, or '' when there is none. */
export function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[}{])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? ''
}

/** The text of the first @media block that starts with this query, such as '(max-width: 599px)', or '' when there is none. */
export function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`)
  if (start < 0) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1
    if (css[i] === '}') depth -= 1
    if (depth === 0) return css.slice(open + 1, i)
  }
  return ''
}

export type CssRule = {
  /** The selector as written, whitespace collapsed. */
  selector: string
  /** The at-rules it sits in, outermost first, such as '@media (max-width: 599px)'. */
  within: string[]
  /** Each declaration, by property, as written (the last one wins when a property is repeated). */
  declarations: Record<string, string>
}

/**
 * Every rule of a stylesheet (comments out), also those inside @media and @container blocks. A small reader for our own
 * stylesheets, which are plain: it does not know about nesting syntax or strings that hold braces.
 */
export function rulesOf(css: string): CssRule[] {
  const rules: CssRule[] = []
  const walk = (text: string, within: string[]) => {
    let depth = 0
    let start = 0
    let open = -1
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i]
      if (char === '{') {
        if (depth === 0) open = i
        depth += 1
      } else if (char === '}') {
        depth -= 1
        if (depth === 0) {
          const head = text.slice(start, open).trim().replace(/\s+/g, ' ')
          const body = text.slice(open + 1, i)
          if (head.startsWith('@')) walk(body, [...within, head])
          else rules.push({ selector: head, within, declarations: declarationsOf(body) })
          start = i + 1
        }
      }
    }
  }
  walk(css, [])
  return rules
}

function declarationsOf(body: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const part of body.split(';')) {
    const colon = part.indexOf(':')
    if (colon < 0) continue
    const property = part.slice(0, colon).trim().toLowerCase()
    if (property !== '') found[property] = part.slice(colon + 1).trim().replace(/\s+/g, ' ')
  }
  return found
}
