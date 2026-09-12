import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Backup } from './Backup'
import { serialiseJournal } from '../domain/journal'
import { createScheduler, Rating } from '../domain/scheduler'
import { loadReviews, recordReview, resetProgress } from '../data/repository'
import type { ReviewEvent } from '../domain/types'
import { expectNoAxeViolations } from '../test/axe'

const scheduler = createScheduler()
const T0 = new Date('2026-05-01T08:00:00Z')
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000)

function journalFile(reviews: ReviewEvent[], name = 'reperes.json'): File {
  return new File([serialiseJournal(reviews, T0)], name, { type: 'application/json' })
}

function setup() {
  const onImported = vi.fn()
  const view = render(<Backup scheduler={scheduler} onImported={onImported} />)
  return { onImported, ...view }
}

async function choose(file: File) {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Importer un fichier'), file)
}

/** Choosing a file only describes it now; merging is a second, deliberate act. */
async function chooseAndMerge(file: File) {
  const user = userEvent.setup()
  await choose(file)
  await user.click(await screen.findByRole('button', { name: 'Fusionner' }))
}

beforeEach(async () => {
  await resetProgress()
})

describe('Backup export', () => {
  it('says there is nothing to export rather than handing over an empty file', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: /Exporter/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(/rien à exporter/)
  })

  it('reports how many reviews left the device', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    await recordReview(
      { cardId: 'carte-a', fsrs: scheduler.create(T0), updatedAt: minutes(1) },
      { cardId: 'carte-a', reviewedAt: minutes(1), grade: Rating.Good },
    )
    setup()

    await user.click(screen.getByRole('button', { name: /Exporter/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(/1 révision exportée/)
    vi.unstubAllGlobals()
  })
})

/*
 * A merge cannot be undone. Not overwriting is not the same as not destroying:
 * a stale backup or someone else's journal goes in and nothing takes it out
 * again. Idempotence only says that importing the *right* file twice is
 * harmless — it says nothing about the wrong one. So the file is read and
 * described first, and merging is a separate, deliberate act.
 */
describe('Backup confirmation', () => {
  it('describes the file instead of merging it straight away', async () => {
    setup()

    await choose(
      journalFile([
        { cardId: 'carte-a', reviewedAt: minutes(5), grade: Rating.Good },
        { cardId: 'carte-b', reviewedAt: minutes(9), grade: Rating.Again },
      ]),
    )

    const summary = await screen.findByRole('group', { name: /Ce que contient ce fichier/ })
    expect(summary).toHaveTextContent(/2 révisions, sur 2 cartes/)
    expect(summary).toHaveTextContent(/2 révisions que cet appareil n’a pas/)
    expect(summary).toHaveTextContent(/ne peut pas être annulé/)
    // Nothing written until someone says so.
    expect(await loadReviews()).toEqual([])
  })

  it('names the period the file covers', async () => {
    setup()

    await choose(
      journalFile([
        { cardId: 'carte-a', reviewedAt: new Date('2026-05-03T09:00:00Z'), grade: Rating.Good },
        { cardId: 'carte-a', reviewedAt: new Date('2026-05-09T09:00:00Z'), grade: Rating.Good },
      ]),
    )

    expect(await screen.findByRole('group')).toHaveTextContent(/du 3 mai 2026 au 9 mai 2026/)
  })

  it('says when a file brings nothing new, before merging it', async () => {
    const already: ReviewEvent[] = [
      { cardId: 'carte-b', reviewedAt: minutes(5), grade: Rating.Good },
    ]
    setup()
    await chooseAndMerge(journalFile(already))

    await choose(journalFile(already))

    expect(await screen.findByRole('group')).toHaveTextContent(
      /aucune que cet appareil ne connaisse déjà/,
    )
  })

  it('writes nothing when the learner cancels', async () => {
    const user = userEvent.setup()
    setup()

    await choose(journalFile([{ cardId: 'carte-b', reviewedAt: minutes(5), grade: Rating.Good }]))
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(await loadReviews()).toEqual([])
  })
})

describe('Backup import', () => {
  it('folds in reviews from another device', async () => {
    const { onImported } = setup()

    await chooseAndMerge(
      journalFile([
        { cardId: 'carte-b', reviewedAt: minutes(5), grade: Rating.Good },
        { cardId: 'carte-b', reviewedAt: minutes(9), grade: Rating.Again },
      ]),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(/2 révisions ajoutées/)
    expect(await loadReviews()).toHaveLength(2)
    expect(onImported).toHaveBeenCalled()
  })

  /*
   * The difference between a merge and a restore, stated to the learner rather
   * than left for them to guess: a file already folded in adds nothing.
   */
  it('says plainly that a second import changed nothing', async () => {
    setup()
    const entry: ReviewEvent = { cardId: 'carte-b', reviewedAt: minutes(5), grade: Rating.Good }

    await chooseAndMerge(journalFile([entry]))
    await chooseAndMerge(journalFile([entry]))

    expect(await screen.findByRole('status')).toHaveTextContent(/Rien de nouveau/)
    expect(await loadReviews()).toHaveLength(1)
  })

  it('refuses a file from somewhere else, and says which file to pick', async () => {
    setup()

    await choose(new File(['{"autre":"appli"}'], 'autre.json', { type: 'application/json' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/ne vient pas de Repères/)
    expect(await loadReviews()).toEqual([])
  })

  // A .json that is truncated or hand-edited: the `accept` attribute lets it
  // through, since it only filters the picker and a learner can override it.
  it('refuses a file it cannot read at all', async () => {
    setup()

    await choose(new File(['{"reviews": [tronq'], 'sauvegarde.json', { type: 'application/json' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/n'est pas lisible/)
  })
})

describe('Backup accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = setup()

    await expectNoAxeViolations(container)
  })
})
