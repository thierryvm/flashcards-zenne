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

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')]) {
  const onStart = vi.fn()
  const view = render(
    <Dashboard cards={cards} scheduler={scheduler} sessionLimit={12} onStart={onStart} now={NOW} />,
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

  it('states theme progress in text, not only as a bar', () => {
    setup()

    expect(screen.getAllByText(/% acquises sur/).length).toBeGreaterThan(0)
  })

  it('shows the week ahead', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Les sept prochains jours' })).toBeInTheDocument()
    expect(screen.getAllByText(/à revoir/).length).toBeGreaterThan(0)
  })

  it('holds back retention until something has been reviewed', () => {
    setup()

    expect(screen.getByText(/La rétention apparaîtra/)).toBeInTheDocument()
  })

  it('reports retention as a percentage once cards have been seen', () => {
    setup([reviewed(makeCard('a'))])

    expect(screen.queryByText(/La rétention apparaîtra/)).not.toBeInTheDocument()
    expect(screen.getByText(/%$/)).toBeInTheDocument()
  })

  it('starts a session on request', async () => {
    const user = userEvent.setup()
    const { onStart } = setup()

    await user.click(screen.getByRole('button', { name: /Commencer une séance/ }))

    expect(onStart).toHaveBeenCalledOnce()
  })

  it('explains the empty state instead of offering a dead button', () => {
    setup([reviewed(makeCard('a'))])

    expect(screen.getByRole('button', { name: /Commencer une séance/ })).toBeDisabled()
    expect(screen.getByText(/Revenez plus tard/)).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = setup()

    await expectNoAxeViolations(container)
  })
})
