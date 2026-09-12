import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home'
import { makeCard, NOW, reviewed, testScheduler as scheduler } from '../test/cards'
import type { StudyCard } from '../domain/types'
import { expectNoAxeViolations } from '../test/axe'

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')], props = {}) {
  const onStart = vi.fn()
  const view = render(
    <Home
      cards={cards}
      scheduler={scheduler}
      sessionLimit={12}
      onStart={onStart}
      now={NOW}
      {...props}
    />,
  )
  return { onStart, ...view }
}

describe('Home', () => {
  it('summarises the deck at a glance', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
    expect(screen.getByText('Nouvelles')).toBeInTheDocument()
  })

  it('starts a session on request', async () => {
    const user = userEvent.setup()
    const { onStart } = setup()

    await user.click(screen.getByRole('button', { name: /Commencer une séance/ }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  /*
   * The complaint that opened this split was "tout est sur la même page". The
   * backward-looking blocks have an address of their own now, and the home page
   * must not quietly grow them back.
   */
  it('sends the backward-looking detail to its own page', () => {
    setup([reviewed(makeCard('a')), makeCard('b', 'sciences')])

    expect(screen.getByRole('link', { name: 'Voir ma progression' })).toHaveAttribute(
      'href',
      '#/progression',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Les sept prochains jours' }),
    ).not.toBeInTheDocument()
  })

  // Rendering without the `now` prop exercises the default the app actually
  // uses; every other test here freezes the clock.
  it('renders against the real clock when no date is supplied', () => {
    render(
      <Home cards={[makeCard('a')]} scheduler={scheduler} sessionLimit={12} onStart={vi.fn()} />,
    )

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Commencer une séance/ })).toBeEnabled()
  })

  /*
   * Measured on 2026-09-11: a second browser profile shows a pristine app, and
   * nothing anywhere tells the learner why. "Stockage local" is not something
   * someone translates into consequences on their own, and discovering it by
   * opening the app on another device — where everything reads as untouched —
   * is the worst way to find out.
   */
  it('says where the progress lives, and what that means', () => {
    setup()

    const note = screen.getByText(/reste sur cet appareil/)
    expect(note).toBeInTheDocument()
    expect(note).toHaveTextContent(/ne vous suivra pas/)
  })

  it('has no accessibility violations', async () => {
    const { container } = setup()

    await expectNoAxeViolations(container)
  })
})

describe('Home retention', () => {
  it('holds back retention until something has been reviewed', () => {
    setup()

    expect(screen.getByText(/La rétention apparaîtra/)).toBeInTheDocument()
  })

  it('reports retention as a percentage once cards have been seen', () => {
    setup([reviewed(makeCard('a'))])

    expect(screen.queryByText(/La rétention apparaîtra/)).not.toBeInTheDocument()
    expect(screen.getByText(/%$/)).toBeInTheDocument()
  })

  // "100 %" after a single easy card is noise without its denominator.
  it('shows how many cards the figure covers', () => {
    setup([reviewed(makeCard('a')), reviewed(makeCard('b')), makeCard('c')])

    expect(screen.getByText('sur 2 cartes')).toBeInTheDocument()
  })
})

describe('Home when storage has failed', () => {
  /*
   * With an unreadable database the deck comes back empty, and the cheerful
   * empty state turned a broken app into one that looked up to date. For an
   * owner who does not read code, that is the worst possible message.
   */
  it('does not present an unreadable database as a finished session', () => {
    setup([], { storageHealthy: false })

    expect(screen.queryByText(/Revenez plus tard/)).not.toBeInTheDocument()
    expect(screen.getByText(/problème d’enregistrement/i)).toBeInTheDocument()
  })

  it('does not promise retention that will never arrive', () => {
    setup([], { storageHealthy: false })

    expect(screen.queryByText(/La rétention apparaîtra/)).not.toBeInTheDocument()
  })

  it('keeps the reassuring empty state when storage is fine', () => {
    setup([reviewed(makeCard('a'))])

    expect(screen.getByText(/Revenez plus tard/)).toBeInTheDocument()
  })
})
