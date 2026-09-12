import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Progress } from './Progress'
import { makeCard, NOW, reviewed } from '../test/cards'
import type { StudyCard } from '../domain/types'
import { expectNoAxeViolations } from '../test/axe'

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')], props = {}) {
  return render(<Progress cards={cards} now={NOW} {...props} />)
}

describe('Progress', () => {
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

  it('has no accessibility violations', async () => {
    const { container } = setup()

    await expectNoAxeViolations(container)
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
})

describe('Progress week ahead', () => {
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
