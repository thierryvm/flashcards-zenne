import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { buildQueue, DEFAULT_SESSION_LIMIT } from './domain/queue'
import { SEED_PARAMETER } from './domain/seed'
import type { CardContent, ThemeId } from './domain/types'

const CARD: CardContent = {
  id: 'test-card',
  theme: 'histoire',
  question: 'Question de test ?',
  answer: 'Réponse de test',
  hint: 'Un indice.',
  source: { title: 'Article', url: 'https://fr.wikipedia.org/wiki/Article' },
}

const loadStudyCards = vi.fn()
const saveProgress = vi.fn()

vi.mock('./data/repository', () => ({
  loadStudyCards: (...args: unknown[]) => loadStudyCards(...args),
  saveProgress: (...args: unknown[]) => saveProgress(...args),
  resetProgress: vi.fn(),
}))

vi.mock('./content/culture-generale', () => ({ CULTURE_GENERALE: [CARD] }))

beforeEach(() => {
  loadStudyCards.mockReset()
  saveProgress.mockReset()
  saveProgress.mockResolvedValue(undefined)
  window.history.replaceState({}, '', '/')
})

function loadWith(cards: unknown[]) {
  loadStudyCards.mockResolvedValue(cards)
}

function studyCard(scheduleAt = new Date('2026-01-01T09:00:00Z')) {
  return {
    content: CARD,
    progress: {
      cardId: CARD.id,
      fsrs: {
        due: scheduleAt,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: 0,
      },
      updatedAt: scheduleAt,
    },
  }
}

/** A deck wide enough that the shuffle has something to shuffle. */
function manyCards() {
  const themes: ThemeId[] = ['histoire', 'geographie', 'sciences', 'arts']
  return themes.flatMap((theme, position) =>
    [0, 1, 2].map((offset) => {
      const id = `${theme}-${offset}`
      return {
        ...studyCard(),
        content: {
          ...CARD,
          id,
          theme,
          question: `Question ${position * 3 + offset} ?`,
        },
        progress: { ...studyCard().progress, cardId: id },
      }
    }),
  )
}

describe('App storage failures', () => {
  /*
   * Browser storage can simply be unavailable: a private window, a corrupted
   * database, a refused quota. Swallowing the error left a serene dashboard —
   * nothing due, no retention, an empty week — under the message "come back
   * later". A broken app that looks up to date is the worst outcome for an
   * owner who cannot read the code.
   */
  it('says so when the deck cannot be read', async () => {
    loadStudyCards.mockRejectedValue(new Error('IndexedDB unavailable'))

    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/n'ont pas pu être chargées/)
  })

  it('does not claim the session is finished when the database is unreadable', async () => {
    loadStudyCards.mockRejectedValue(new Error('IndexedDB unavailable'))

    render(<App />)

    await screen.findByRole('alert')
    expect(screen.queryByText(/Revenez plus tard/)).not.toBeInTheDocument()
  })

  it('says so when a review cannot be written', async () => {
    const user = userEvent.setup()
    loadWith([studyCard()])
    saveProgress.mockRejectedValue(new Error('quota exceeded'))

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /Correct/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/n'a pas pu être enregistrée/)
  })

  it('stays quiet while storage works', async () => {
    loadWith([studyCard()])

    render(<App />)

    await screen.findByRole('button', { name: /Commencer une séance/ })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('App navigation', () => {
  it('offers a way back to the dashboard during a session', async () => {
    const user = userEvent.setup()
    loadWith([studyCard()])

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    expect(screen.getByRole('heading', { name: 'Question de test ?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tableau de bord' }))
    expect(screen.getByRole('heading', { name: 'Votre progression' })).toBeInTheDocument()
  })

  it('hides the dashboard link when already on the dashboard', async () => {
    loadWith([studyCard()])

    render(<App />)

    await screen.findByRole('button', { name: /Commencer une séance/ })
    expect(screen.queryByRole('button', { name: 'Tableau de bord' })).not.toBeInTheDocument()
  })
})

/*
 * Sessions are seeded with the clock, so two screenshots of the study screen
 * never show the same card and cannot be compared. `?graine=<n>` pins the seed
 * for the run.
 */
describe('App pinned seed', () => {
  async function firstQuestionWith(search: string) {
    const user = userEvent.setup()
    window.history.replaceState({}, '', search)
    loadWith(manyCards())

    const view = render(<App />)
    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    const heading = screen.getByRole('heading', { level: 2 }).textContent
    view.unmount()
    return heading
  }

  it('builds the session with the seed from the address bar', async () => {
    const expected = buildQueue(manyCards(), { limit: DEFAULT_SESSION_LIMIT, seed: 42 })[0]

    expect(await firstQuestionWith(`/?${SEED_PARAMETER}=42`)).toBe(expected.content.question)
  })

  it('gives the same session twice for the same seed', async () => {
    const once = await firstQuestionWith(`/?${SEED_PARAMETER}=42`)
    const twice = await firstQuestionWith(`/?${SEED_PARAMETER}=42`)

    expect(twice).toBe(once)
  })

  it('shows the pinned seed so a capture carries it', async () => {
    window.history.replaceState({}, '', `/?${SEED_PARAMETER}=42`)
    loadWith(manyCards())

    render(<App />)

    expect(await screen.findByText('graine 42')).toBeInTheDocument()
  })

  it('says nothing when no seed is pinned', async () => {
    loadWith(manyCards())

    render(<App />)

    await screen.findByRole('button', { name: /Commencer une séance/ })
    expect(screen.queryByText(/^graine /)).not.toBeInTheDocument()
  })

  it('ignores a seed it cannot read, visibly', async () => {
    loadWith(manyCards())
    window.history.replaceState({}, '', `/?${SEED_PARAMETER}=quarante-deux`)

    render(<App />)

    await screen.findByRole('button', { name: /Commencer une séance/ })
    expect(screen.queryByText(/^graine /)).not.toBeInTheDocument()
  })
})
