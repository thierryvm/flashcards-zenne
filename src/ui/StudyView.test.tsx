import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StudyView } from './StudyView'
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
      hint: `Indice ${id}`,
      elaboration: `Contexte ${id}`,
      source: { title: `Article ${id}`, url: `https://fr.wikipedia.org/wiki/Article_${id}` },
    },
    progress: { cardId: id, fsrs: scheduler.create(NOW), updatedAt: NOW },
  }
}

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')]) {
  const onReview = vi.fn()
  const onFinish = vi.fn()
  const onExit = vi.fn()
  const view = render(
    <StudyView queue={cards} onReview={onReview} onFinish={onFinish} onExit={onExit} />,
  )
  return { onReview, onFinish, onExit, ...view }
}

describe('StudyView', () => {
  it('shows the question and hides the answer until asked', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Question a ?' })).toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('announces the learner position in the session', () => {
    setup()

    expect(screen.getByText(/Carte 1 sur 2/)).toBeInTheDocument()
  })

  it('keeps the source hidden until the answer is shown, so it cannot leak it', () => {
    setup()

    expect(screen.queryByRole('link', { name: /Vérifier/ })).not.toBeInTheDocument()
  })

  it('offers the reference article once the answer is shown', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    const link = screen.getByRole('link', { name: /Vérifier/ })
    expect(link).toHaveAttribute('href', 'https://fr.wikipedia.org/wiki/Article_a')
    expect(link).toHaveAccessibleName(/nouvel onglet/)
  })

  it('reveals the answer on demand', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByText('Réponse a')).toBeInTheDocument()
    expect(screen.getByText('Contexte a')).toBeInTheDocument()
  })

  it('opens help one rung at a time, starting with what is being asked', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))

    expect(screen.getByText('De quoi parle-t-on ?')).toBeInTheDocument()
    expect(screen.queryByText(/Indice a/)).not.toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('reaches the authored cue on the second rung', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    expect(screen.getByText(/Indice a/)).toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('ends with the shape of the answer, without revealing it', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    expect(screen.getByText('La forme de la réponse')).toBeInTheDocument()
    expect(screen.getByText('R······ a')).toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('stops offering help once every rung is open', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    expect(screen.queryByRole('button', { name: /indice de plus/ })).not.toBeInTheDocument()
  })

  it('lets the learner leave the session at any point', async () => {
    const user = userEvent.setup()
    const { onExit } = setup()

    await user.click(screen.getByRole('button', { name: 'Quitter la séance' }))

    expect(onExit).toHaveBeenCalledOnce()
  })

  it('shows the learner their own previous explanation', async () => {
    const user = userEvent.setup()
    const card = makeCard('a')
    card.progress.note = 'Parce que la forteresse était un symbole royal.'
    setup([card])

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByText(/Votre explication, la dernière fois/)).toBeInTheDocument()
    expect(screen.getByText(/symbole royal/)).toBeInTheDocument()
  })

  it('does not invent a previous explanation when there is none', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.queryByText(/Votre explication/)).not.toBeInTheDocument()
  })

  it('reveals with the space bar', async () => {
    const user = userEvent.setup()
    setup()

    await user.keyboard(' ')

    expect(screen.getByText('Réponse a')).toBeInTheDocument()
  })

  it('grades with the number keys once revealed', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.keyboard(' ')
    await user.keyboard('3')

    expect(onReview).toHaveBeenCalledOnce()
    expect(onReview.mock.calls[0][1]).toBe(Rating.Good)
  })

  it('does not grade while the learner is typing a note', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.type(screen.getByLabelText(/Pourquoi/), '1234')

    expect(onReview).not.toHaveBeenCalled()
  })

  it('passes the note along with the grade', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.type(screen.getByLabelText(/Pourquoi/), 'parce que')
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    expect(onReview.mock.calls[0][2]).toBe('parce que')
  })

  it('moves to the next card and resets the reveal', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Facile/ }))

    expect(screen.getByRole('heading', { name: 'Question b ?' })).toBeInTheDocument()
    expect(screen.queryByText('Réponse b')).not.toBeInTheDocument()
  })

  it('signals the end of the session after the last card', async () => {
    const user = userEvent.setup()
    const { onFinish } = setup([makeCard('only')])

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('has no accessibility violations before the answer is shown', async () => {
    const { container } = setup()

    await expectNoAxeViolations(container)
  })

  it('has no accessibility violations once the answer is shown', async () => {
    const user = userEvent.setup()
    const { container } = setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    await expectNoAxeViolations(container)
  })
})
