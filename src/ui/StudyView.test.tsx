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
      unverified: true,
    },
    progress: { cardId: id, fsrs: scheduler.create(NOW), updatedAt: NOW },
  }
}

function setup(cards: StudyCard[] = [makeCard('a'), makeCard('b', 'sciences')]) {
  const onReview = vi.fn()
  const onFinish = vi.fn()
  const view = render(<StudyView queue={cards} onReview={onReview} onFinish={onFinish} />)
  return { onReview, onFinish, ...view }
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

  it('flags cards that no human has checked', () => {
    setup()

    expect(screen.getByText(/non vérifiée/)).toBeInTheDocument()
  })

  it('reveals the answer on demand', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByText('Réponse a')).toBeInTheDocument()
    expect(screen.getByText('Contexte a')).toBeInTheDocument()
  })

  it('offers a hint that narrows the answer without giving it', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Un indice' }))

    expect(screen.getByText(/Indice a/)).toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
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
