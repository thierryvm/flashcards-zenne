import axe from 'axe-core'

/**
 * Fails with the offending rule and the exact markup, so a violation points at
 * what to change rather than just saying the page is inaccessible.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    // `region` expects every node to sit inside a landmark. Components are
    // rendered in isolation here; the landmark check belongs to the app shell.
    rules: { region: { enabled: false } },
  })

  if (results.violations.length === 0) return

  const report = results.violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `    ${node.html}`).join('\n')
      return `  ${violation.id} — ${violation.help}\n${nodes}\n    → ${violation.helpUrl}`
    })
    .join('\n')

  throw new Error(`${results.violations.length} violation(s) d'accessibilité :\n${report}`)
}
