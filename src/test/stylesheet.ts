/**
 * Compiles `src/index.css` through the production pipeline and hands back the
 * CSS a browser would actually receive.
 *
 * Asserting on the source file instead is what let a broken palette ship: an
 * `@theme` block nested in `@media (prefers-color-scheme: dark)` parses fine,
 * reads fine, and is silently folded into the root theme by Tailwind v4 — so
 * the dark values overwrote the light ones and no test on the input could see
 * it. The compiler is the only witness that counts.
 */
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('../..', import.meta.url))
const entry = fileURLToPath(new URL('../index.css', import.meta.url))

let pending: Promise<string> | undefined

/** Memoised: the compilation costs a second or two and never varies in a run. */
export function compiledStylesheet(): Promise<string> {
  pending ??= compile()
  return pending
}

async function compile(): Promise<string> {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [tailwindcss()],
    // Minification stays on: shortened hex codes and dropped declarations are
    // part of what the browser gets, so they are part of what is checked.
    build: { write: false, rollupOptions: { input: entry } },
  })

  if (!Array.isArray(result) && !('output' in result)) {
    throw new Error('the stylesheet build returned a watcher instead of a result')
  }
  const { output } = Array.isArray(result) ? result[0] : result

  const stylesheet = output.find(
    (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css'),
  )
  if (!stylesheet || stylesheet.type !== 'asset') {
    throw new Error('the stylesheet build produced no CSS asset')
  }
  return String(stylesheet.source)
}
