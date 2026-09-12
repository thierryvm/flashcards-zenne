/**
 * Two pages, addressed by hash.
 *
 * Hash rather than the history API because the app is served by GitHub Pages:
 * a real path would 404 on a direct load or a refresh unless a 404.html stood
 * in for a server, and a learner who bookmarks their progress page would find
 * a GitHub error instead of it.
 *
 * A session is deliberately *not* a route. Its queue lives in memory, so an
 * address that claimed to be a session would not survive a refresh — it would
 * promise a page it cannot rebuild.
 */
export const ROUTES = ['accueil', 'progression'] as const
export type Route = (typeof ROUTES)[number]

const HASHES: Record<Route, string> = {
  accueil: '#/',
  progression: '#/progression',
}

/** Anything unrecognised is the home page: an address is not an error page. */
export function readRoute(hash: string): Route {
  const normalised = hash.replace(/^#\/?/, '').replace(/\/$/, '')
  return (ROUTES as readonly string[]).includes(normalised) ? (normalised as Route) : 'accueil'
}

export function hashFor(route: Route): string {
  return HASHES[route]
}
