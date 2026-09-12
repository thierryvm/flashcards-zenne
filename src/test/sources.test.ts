// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE = fileURLToPath(new URL('..', import.meta.url))

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : []
    }),
  )
  return files.flat()
}

/*
 * `reviewKey` was written with NUL bytes where its spaces should have been.
 * Nothing failed: the key still worked, the tests still passed, and the file
 * still read correctly on screen. What it did instead was make git treat
 * `journal.ts` as binary, so every pull request touching it showed "Binary file
 * not shown" rather than a diff — the one file holding the merge logic, quietly
 * exempt from review.
 *
 * The symptom was visible twice before I looked at it: `grep` returned nothing
 * on a file I could plainly read. Routing around an anomaly is how it survives.
 */
describe('source files', () => {
  it('contain no invisible control characters', async () => {
    // Written as escapes on purpose: a literal control character here would
    // make this very file one of the things it is meant to catch.
    //
    // Tab, line feed and carriage return are left out: they are how a text file
    // is laid out, not anomalies. Everything else below U+0020 is forbidden, and
    // so are DEL and the C1 block — a review of #23 pointed out they were missing,
    // and a planted U+007F and U+0085 did pass the narrower pattern.
    //
    // Deliberately not covered: the invisible characters that are not controls,
    // such as U+00A0. A non-breaking space before `?` or `:` is correct French
    // typography, and this repository's content is French.
    // oxlint-disable-next-line no-control-regex -- matching them is the point
    const forbidden = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/

    for (const path of await sourceFiles(SOURCE)) {
      const text = await readFile(path, 'utf8')
      const line = text.split('\n').findIndex((content) => forbidden.test(content))
      expect(line, `${path} line ${line + 1} holds a control character`).toBe(-1)
    }
  })
})
