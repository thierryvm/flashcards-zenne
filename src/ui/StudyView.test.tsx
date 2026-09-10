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

  it('reveals the answer on demand', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByText('Réponse a')).toBeInTheDocument()
    expect(screen.getByText('Contexte a')).toBeInTheDocument()
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
  })

  /*
   * A sighted person sees the new tab arrive and loses nothing by it; a
   * screen-reader user gets no such signal, so the warning is announced rather
   * than printed. This is an affordance announcement, not content — unlike the
   * hint ladder, where two versions of the hint itself could drift apart.
   */
  it('announces the new tab without printing it on every card', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    const link = screen.getByRole('link', { name: /Vérifier/ })
    expect(link).toHaveAccessibleName(/nouvel onglet/)
    expect(link.querySelector('.sr-only')).toHaveTextContent('(nouvel onglet)')
  })

  /*
   * The question and the answer are 1.75 rem and 1.375 rem, which DESIGN.md
   * fixes. Stepping the question back to `muted` on reveal leaves the answer as
   * the only thing in full ink, so it dominates without touching the scale.
   */
  it('steps the question back once the answer is out', async () => {
    const user = userEvent.setup()
    setup()

    const question = screen.getByRole('heading', { name: 'Question a ?' })
    expect(question.className).not.toContain('text-muted')

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(question.className).toContain('text-muted')
  })
})

describe('StudyView hint ladder', () => {
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
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  /*
   * This rung was a row of middle dots in a monospace face: unreadable on
   * screen, and read out dot by dot by a screen reader, so it also had a hidden
   * prose twin. There is one version now, and it is the prose one.
   */
  it('says the shape in words rather than drawing it', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    expect(screen.getByText('2 mots : 7 lettres commençant par R, 1 lettre.')).toBeInTheDocument()
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('announces newly opened hints, since they appear above the button', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))

    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('aria-live', 'polite')
  })

  it('stops offering help once every rung is open', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    expect(screen.queryByRole('button', { name: /indice de plus/ })).not.toBeInTheDocument()
  })

  /*
   * "Afficher la réponse" used to be the filled, primary button and "Aidez-moi"
   * the outlined one below it, so the most inviting gesture on the screen was
   * the one that skips retrieval altogether. Order in the DOM is order for the
   * eye and for the Tab key alike.
   */
  it('puts asking for help before giving up', () => {
    setup()

    const buttons = screen.getAllByRole('button').map((button) => button.textContent)
    const help = buttons.findIndex((label) => label?.startsWith('Aidez-moi'))
    const reveal = buttons.indexOf('Afficher la réponse')

    expect(help).toBeGreaterThanOrEqual(0)
    expect(help).toBeLessThan(reveal)
  })
})

/*
 * The four grades were byte-identical buttons: same border, same background,
 * same weight, folding into a 2x2 grid on a phone that read as a menu of equal
 * options. DESIGN.md asks for one hue at four decreasing intensities, with
 * "À revoir" the most visible — saying you did not know should be the easiest
 * gesture on the screen, never a red button that reads as a failure.
 */
describe('StudyView grades', () => {
  async function revealed() {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    return ['À revoir', 'Difficile', 'Correct', 'Facile'].map(
      (label) => screen.getByRole('button', { name: new RegExp(`^${label}`) }).className,
    )
  }

  it('gives the four grades four different weights', async () => {
    const styles = await revealed()

    expect(new Set(styles).size).toBe(4)
  })

  it('makes "À revoir" the filled one and "Facile" the bare one', async () => {
    const [again, hard, good, easy] = await revealed()

    expect(again).toContain('bg-accent')
    expect(hard).toContain('bg-grade-hard')
    expect(good).toContain('bg-grade-good')
    expect(easy).not.toContain('bg-')
  })

  /*
   * "Facile" was outlined in `muted`, the colour of "Tableau de bord" and
   * "Quitter la séance". That put the fourth step of the scale in the same
   * family as the navigation instead of next to "Correct". The outline is the
   * 0 % step of the ramp, so it is bounded in the ramp's colour.
   */
  it('keeps all four inside the accent family, outline included', async () => {
    for (const style of await revealed()) {
      expect(style).toContain('border-accent')
    }
  })

  it('uses no second hue, so nothing reads as a red failure', async () => {
    const styles = await revealed()

    for (const style of styles) {
      expect(style).not.toMatch(/bg-(red|green|amber|orange|danger|ok)/)
    }
  })
})

/*
 * The reveal shortcut used to call preventDefault() on Space for every target
 * that was not a text field, which cancelled the native activation of whatever
 * button had focus. The hint ladder and the exit button were mouse-only, and
 * the exit button failed exactly when someone wanted to stop. WCAG 2.1.1.
 */
describe('StudyView keyboard', () => {
  it('reveals with the space bar when no control has focus', async () => {
    const user = userEvent.setup()
    setup()

    await user.keyboard(' ')

    expect(screen.getByText('Réponse a')).toBeInTheDocument()
  })

  it('activates a focused hint button with the space bar instead of revealing', async () => {
    const user = userEvent.setup()
    setup()

    screen.getByRole('button', { name: /Aidez-moi/ }).focus()
    await user.keyboard(' ')

    expect(screen.getByText('De quoi parle-t-on ?')).toBeInTheDocument()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('activates a focused exit button with the space bar instead of revealing', async () => {
    const user = userEvent.setup()
    const { onExit } = setup()

    screen.getByRole('button', { name: 'Quitter la séance' }).focus()
    await user.keyboard(' ')

    expect(onExit).toHaveBeenCalledOnce()
    expect(screen.queryByText('Réponse a')).not.toBeInTheDocument()
  })

  it('activates a focused button with Enter instead of revealing', async () => {
    const user = userEvent.setup()
    const { onExit } = setup()

    screen.getByRole('button', { name: 'Quitter la séance' }).focus()
    await user.keyboard('{Enter}')

    expect(onExit).toHaveBeenCalledOnce()
  })

  it('grades with the number keys once revealed', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.keyboard(' ')
    await user.keyboard('3')

    expect(onReview).toHaveBeenCalledOnce()
    expect(onReview.mock.calls[0][1]).toBe(Rating.Good)
  })

  it.each(['{Control>}1{/Control}', '{Alt>}1{/Alt}', '{Meta>}1{/Meta}'])(
    'ignores %s so a browser shortcut is never hijacked',
    async (keys) => {
      const user = userEvent.setup()
      const { onReview } = setup()

      await user.keyboard(' ')
      await user.keyboard(keys)

      expect(onReview).not.toHaveBeenCalled()
    },
  )

  it('does not grade while the learner is typing a note', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.type(screen.getByLabelText(/Pourquoi/), '1234')

    expect(onReview).not.toHaveBeenCalled()
  })
})

describe('StudyView focus', () => {
  it('puts focus on the question so it is read first', () => {
    setup()

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Question a ?' }))
  })

  it('moves focus to the answer when it is revealed', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(document.activeElement?.textContent).toContain('Réponse a')
  })

  // Focus used to fall back to <body> on every card, silently returning a
  // screen-reader user to the top of the document twelve times a session.
  it('moves focus to the next question rather than dropping it on the body', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Facile/ }))

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Question b ?' }))
    expect(document.activeElement).not.toBe(document.body)
  })
})

describe('StudyView note', () => {
  it('pre-fills the field with the previous explanation', async () => {
    const user = userEvent.setup()
    const card = makeCard('a')
    card.progress.note = 'Parce que la forteresse était un symbole royal.'
    setup([card])

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByLabelText(/Pourquoi/)).toHaveValue(
      'Parce que la forteresse était un symbole royal.',
    )
  })

  it('starts empty when there is no previous explanation', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))

    expect(screen.getByLabelText(/Pourquoi/)).toHaveValue('')
  })

  it('passes the note along with the grade', async () => {
    const user = userEvent.setup()
    const { onReview } = setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.type(screen.getByLabelText(/Pourquoi/), 'parce que')
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    expect(onReview.mock.calls[0][2]).toBe('parce que')
  })

  // The note used to fall back to its previous value, so it could never be
  // deleted once written.
  it('lets the learner erase a note by clearing the field', async () => {
    const user = userEvent.setup()
    const card = makeCard('a')
    card.progress.note = 'Une explication à effacer.'
    const { onReview } = setup([card])

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.clear(screen.getByLabelText(/Pourquoi/))
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    expect(onReview.mock.calls[0][2]).toBeUndefined()
  })
})

describe('StudyView session flow', () => {
  it('lets the learner leave the session at any point', async () => {
    const user = userEvent.setup()
    const { onExit } = setup()

    await user.click(screen.getByRole('button', { name: 'Quitter la séance' }))

    expect(onExit).toHaveBeenCalledOnce()
  })

  it('moves to the next card and resets the reveal', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Facile/ }))

    expect(screen.getByRole('heading', { name: 'Question b ?' })).toBeInTheDocument()
    expect(screen.queryByText('Réponse b')).not.toBeInTheDocument()
  })

  it('closes the hints when moving to the next card', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Facile/ }))

    expect(screen.queryByText('De quoi parle-t-on ?')).not.toBeInTheDocument()
  })

  it('signals the end of the session after the last card', async () => {
    const user = userEvent.setup()
    const { onFinish } = setup([makeCard('only')])

    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    expect(onFinish).toHaveBeenCalledOnce()
  })
})

describe('StudyView accessibility', () => {
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

  it('has no accessibility violations with every hint open', async () => {
    const user = userEvent.setup()
    const { container } = setup()

    await user.click(screen.getByRole('button', { name: /Aidez-moi/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))
    await user.click(screen.getByRole('button', { name: /Un indice de plus/ }))

    await expectNoAxeViolations(container)
  })
})
