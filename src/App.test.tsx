import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { buildQueue, DEFAULT_SESSION_LIMIT } from './domain/queue'
import { SEED_PARAMETER } from './domain/seed'
import { Rating } from './domain/scheduler'
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
const recordReview = vi.fn()

vi.mock('./data/repository', () => ({
  loadStudyCards: (...args: unknown[]) => loadStudyCards(...args),
  recordReview: (...args: unknown[]) => recordReview(...args),
  loadReviews: vi.fn(),
  resetProgress: vi.fn(),
}))

vi.mock('./content/culture-generale', () => ({ CULTURE_GENERALE: [CARD] }))

beforeEach(() => {
  loadStudyCards.mockReset()
  recordReview.mockReset()
  recordReview.mockResolvedValue(undefined)
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
    recordReview.mockRejectedValue(new Error('quota exceeded'))

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

/*
 * A review is written twice: as a fact in the journal, and as the state it
 * produced. The two must carry the same instant. Taking `new Date()` a second
 * time would leave a journal whose timestamps are close to, but not the same
 * as, the ones the intervals were computed from — and a replay would drift
 * away from the state it is meant to rebuild, silently.
 */
describe('App review journal', () => {
  it('records the review as a fact alongside the state it produced', async () => {
    const user = userEvent.setup()
    loadWith([studyCard()])

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /^Correct/ }))

    expect(recordReview).toHaveBeenCalledOnce()
    const [, event] = recordReview.mock.calls[0]
    expect(event.cardId).toBe(CARD.id)
    expect(event.grade).toBe(Rating.Good)
  })

  it('uses one instant for the schedule and the journal', async () => {
    const user = userEvent.setup()
    loadWith([studyCard()])

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    await user.click(screen.getByRole('button', { name: 'Afficher la réponse' }))
    await user.click(screen.getByRole('button', { name: /^Correct/ }))

    const [progress, event] = recordReview.mock.calls[0]
    expect(event.reviewedAt).toEqual(progress.updatedAt)
    // The instant FSRS actually computed from, not one taken nearby.
    expect(progress.fsrs.last_review).toEqual(event.reviewedAt)
  })
})

describe('App navigation', () => {
  it('offers a way back home during a session', async () => {
    const user = userEvent.setup()
    loadWith([studyCard()])

    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Commencer une séance/ }))
    expect(screen.getByRole('heading', { name: 'Question de test ?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accueil' }))
    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
  })

  it('hides the way back when already home', async () => {
    loadWith([studyCard()])

    render(<App />)

    await screen.findByRole('button', { name: /Commencer une séance/ })
    expect(screen.queryByRole('button', { name: 'Accueil' })).not.toBeInTheDocument()
  })
})

/*
 * The progress page has an address. That is the whole point of the split: it
 * can be bookmarked, reached with Back, and refreshed — none of which a piece
 * of component state offers.
 */
describe('App routing', () => {
  async function renderAt(hash: string) {
    window.history.replaceState({}, '', hash)
    loadWith([studyCard()])
    const view = render(<App />)
    await screen.findByRole('heading', { level: 2 })
    return view
  }

  it('opens the progress page at its own address', async () => {
    await renderAt('#/progression')

    expect(screen.getByRole('heading', { name: 'Votre progression' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Commencer une séance/ })).not.toBeInTheDocument()
  })

  it('opens home at the root address', async () => {
    await renderAt('#/')

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
  })

  // A stale bookmark is not an error state: there is nothing a learner could do
  // with "page inconnue", and home is always a correct answer to "where am I".
  it('lands home on an address it does not know', async () => {
    await renderAt('#/tableau-de-bord')

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
  })

  it('follows the address when it changes under it', async () => {
    await renderAt('#/')

    await act(async () => {
      window.location.hash = '#/progression'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(screen.getByRole('heading', { name: 'Votre progression' })).toBeInTheDocument()
  })

  /*
   * A session has no address of its own — its queue lives in memory and would
   * not survive a refresh. So starting one from the progress page has to put
   * the address back, or Back would return to a page the app is not showing.
   */
  it('drops the progress address when a session starts', async () => {
    const user = userEvent.setup()
    await renderAt('#/progression')

    await act(async () => {
      window.location.hash = '#/'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await user.click(screen.getByRole('button', { name: /Commencer une séance/ }))

    expect(screen.getByRole('heading', { name: 'Question de test ?' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/')
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
