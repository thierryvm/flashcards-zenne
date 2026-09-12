import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard'
import { createScheduler, Rating } from '../domain/scheduler'
import type { StudyCard, ThemeId } from '../domain/types'
import { expectNoAxeViolations } from '../test/axe'

const NOW = new Date('2026-01-01T09:00:00Z')
const scheduler = createScheduler()

function makeCard(id: string, theme: ThemeId = 'histoire'): StudyCard {
  return {
    content: {
      id,
      theme,
      question: `Question ${id} ?`,
      answer: `Réponse ${id}`,
      source: { title: id, url: `https://fr.wikipedia.org/wiki/${id}` },
    },
    progress: { cardId: id, fsrs: scheduler.create(NOW), updatedAt: NOW },
  }
}

function reviewed(card: StudyCard): StudyCard {
  return {
    ...card,
    progress: { ...card.progress, fsrs: scheduler.review(card.progress.fsrs, Rating.Good, NOW) },
  }
}

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')], props = {}) {
  const onStart = vi.fn()
  const view = render(
    <Dashboard
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

describe('Dashboard', () => {
  it('summarises the deck at a glance', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Votre progression' })).toBeInTheDocument()
    expect(screen.getByText('Nouvelles')).toBeInTheDocument()
  })

  it('breaks progress down by theme', () => {
    setup()

    const table = screen.getByRole('table')
    expect(within(table).getByRole('rowheader', { name: /Histoire/ })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: /Sciences/ })).toBeInTheDocument()
  })

  it('states theme progress in text once there is progress to state', () => {
    setup([reviewed(makeCard('a')), makeCard('b', 'sciences')])

    expect(screen.getAllByText(/% acquises sur/).length).toBeGreaterThan(0)
  })

  /*
   * "Acquises", "En cours" and "À revoir" can only be zero before the first
   * session. Eight themes made that twenty-four zeros on the very first screen
   * anyone sees — the loudest thing on the page, and the least informative.
   */
  describe('before the first session', () => {
    it('shows how many cards a theme holds and nothing else', () => {
      setup()

      const table = screen.getByRole('table')
      expect(within(table).getByRole('columnheader', { name: 'Cartes' })).toBeInTheDocument()
      expect(
        within(table).queryByRole('columnheader', { name: 'Acquises' }),
      ).not.toBeInTheDocument()
      expect(
        within(table).queryByRole('columnheader', { name: 'En cours' }),
      ).not.toBeInTheDocument()
    })

    it('brings the columns back once a card has been reviewed', () => {
      setup([reviewed(makeCard('a')), makeCard('b', 'sciences')])

      const table = screen.getByRole('table')
      expect(within(table).getByRole('columnheader', { name: 'Acquises' })).toBeInTheDocument()
      expect(within(table).getByRole('columnheader', { name: 'Non vues' })).toBeInTheDocument()
      expect(within(table).queryByRole('columnheader', { name: 'Cartes' })).not.toBeInTheDocument()
    })

    /**
     * jsdom ne met rien en page : ce test ne peut pas voir un en-tête de
     * travers, il ne peut que vérifier la déclaration qui l'empêche. La preuve
     * du défaut est ailleurs — mesurée dans un vrai navigateur à 390 px, où le
     * bas de « Thème » était 10,5 px au-dessus de celui de « En cours » parce
     * que les libellés courts flottaient au milieu des longs repliés.
     */
    it('sits every column header on the same baseline', () => {
      setup([reviewed(makeCard('a')), makeCard('b', 'sciences')])

      const table = screen.getByRole('table')
      const headers = within(table).getAllByRole('columnheader')
      expect(headers).toHaveLength(5)
      for (const header of headers) {
        expect(header.className).toContain('align-bottom')
      }
    })
  })

  it('starts a session on request', async () => {
    const user = userEvent.setup()
    const { onStart } = setup()

    await user.click(screen.getByRole('button', { name: /Commencer une séance/ }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  // Rendering without the `now` prop exercises the default the app actually
  // uses; every other test here freezes the clock.
  it('renders against the real clock when no date is supplied', () => {
    render(
      <Dashboard
        cards={[makeCard('a')]}
        scheduler={scheduler}
        sessionLimit={12}
        onStart={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Votre progression' })).toBeInTheDocument()
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

describe('Dashboard retention', () => {
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

describe('Dashboard week ahead', () => {
  it('shows the week ahead', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Les sept prochains jours' })).toBeInTheDocument()
  })

  /*
   * A new deck used to show "48 nouvelles" in the counters and seven empty days
   * underneath, because unseen cards were left out of the schedule entirely.
   */
  it('counts never-seen cards in today rather than showing an empty week', () => {
    setup([makeCard('a'), makeCard('b')])

    expect(screen.getByText(/2 nouvelles/)).toBeInTheDocument()
  })

  it('names overdue cards instead of folding them silently into today', () => {
    const card = reviewed(makeCard('a'))
    const muchLater = new Date(NOW.getTime() + 400 * 86_400_000)
    setup([card], { now: muchLater })

    expect(screen.getByText(/1 en retard/)).toBeInTheDocument()
  })
})

describe('Dashboard when storage has failed', () => {
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
