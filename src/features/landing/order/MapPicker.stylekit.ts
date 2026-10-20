// For tests of what a stylesheet of this folder does. Vitest does not load CSS (`css: false` in vite.config.ts): a CSS
// Module comes back as an object that only names its classes, and a plain stylesheet as an empty string. So the file is
// read from disk, and the page gets it as the browser would.

type Fs = { readFileSync(path: URL, encoding: 'utf8'): string }

async function readStylesheet(name: string): Promise<string> {
  // A variable, so that the type-check of the app, which has no Node types, does not try to resolve the module.
  const node = 'node:fs'
  const { readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  return readFileSync(new URL(name, import.meta.url), 'utf8')
}

/**
 * Puts the stylesheet in the page, so `getComputedStyle` and the accessibility queries answer as they would in a browser.
 * `classes` is the CSS Module object of the same file: the stylesheet is rewritten to the names it gives. A class
 * written `:global(...)` is Leaflet's, and stays as it is. Returns the function that takes the stylesheet out again.
 */
export async function installStylesheet(name: string, classes: Readonly<Record<string, string>>): Promise<() => void> {
  const css = (await readStylesheet(name)).replace(
    /:global\(([^)]*)\)|\.([A-Za-z_][\w-]*)/g,
    (_match, kept: string | undefined, local: string | undefined) => kept ?? `.${classes[local ?? '']}`,
  )
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
  return () => style.remove()
}

/** What the stylesheet gives `property` in the rule whose selector is exactly `selector`, as written; or undefined. */
export async function declaredValue(name: string, selector: string, property: string): Promise<string | undefined> {
  const css = await readStylesheet(name)
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rule = new RegExp(`(?:^|\\})\\s*${escape(selector)}\\s*\\{([^}]*)\\}`, 'm').exec(css)
  const declaration = new RegExp(`(?:^|[\\s;])${escape(property)}\\s*:\\s*([^;]+);`).exec(rule?.[1] ?? '')
  return declaration?.[1]?.trim()
}
