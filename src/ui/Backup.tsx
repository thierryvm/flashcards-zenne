import { useId, useRef, useState } from 'react'
import {
  JournalFileError,
  parseJournal,
  serialiseJournal,
  summariseJournal,
  type JournalSummary,
} from '../domain/journal'
import type { Scheduler } from '../domain/scheduler'
import type { ReviewEvent } from '../domain/types'
import { importJournal, loadReviews } from '../data/repository'

export interface BackupProps {
  scheduler: Scheduler
  /** Called after a successful import, so the dashboard reflects the new state. */
  onImported: () => void
}

type Outcome = { kind: 'ok' | 'error'; message: string } | null
type Pending = { reviews: ReviewEvent[]; summary: JournalSummary } | null

const BUTTON = 'min-h-12 rounded-button border-muted text-label border px-5 py-2 font-semibold'
const PRIMARY =
  'min-h-12 rounded-button bg-accent text-accent-text border-accent text-label border px-5 py-2 font-semibold'

const DAY = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function downloadName(now: Date): string {
  const [date] = now.toISOString().split('T')
  return `reperes-${date}.json`
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value > 1 ? 's' : ''}`
}

/** "le 3 mars 2026" for one day, "du 3 au 9 mars 2026" for a span. */
function period(from: Date, to: Date): string {
  const start = DAY.format(from)
  const end = DAY.format(to)
  return start === end ? `le ${start}` : `du ${start} au ${end}`
}

/**
 * Taking the progress off the device, and putting someone else's back on.
 *
 * The file holds the review journal, not the schedule. The schedule is
 * recomputed on import, because it is an opinion derived from the reviews and
 * the reviews are what actually happened. That is also what lets two files be
 * folded together instead of one replacing the other: reviews are facts, and
 * the union of two sets of facts, sorted by time, is simply the whole story.
 */
export function Backup({ scheduler, onImported }: BackupProps) {
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [pending, setPending] = useState<Pending>(null)
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  async function exportJournal() {
    try {
      const reviews = await loadReviews()
      if (reviews.length === 0) {
        setOutcome({
          kind: 'error',
          message: "Il n'y a rien à exporter pour l'instant : aucune révision enregistrée.",
        })
        return
      }

      const now = new Date()
      const blob = new Blob([serialiseJournal(reviews, now)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = downloadName(now)
      link.click()
      URL.revokeObjectURL(url)

      setOutcome({
        kind: 'ok',
        message: `${reviews.length} révision${reviews.length > 1 ? 's' : ''} exportée${reviews.length > 1 ? 's' : ''} dans ${downloadName(now)}.`,
      })
    } catch {
      setOutcome({
        kind: 'error',
        message: "L'export a échoué : vos révisions n'ont pas pu être lues.",
      })
    }
  }

  /**
   * Reads the file and describes it. Nothing is written yet.
   *
   * Non-overwriting is not the same as non-destructive: a merge cannot be
   * undone, and a stale backup or someone else's journal goes in and stays in.
   * So the file is read, summarised, and shown — a confirmation that teaches
   * something, rather than one that only asks.
   */
  /**
   * Clearing the input is what lets the same file be chosen twice in a row —
   * without it the second choice fires no change event. It happens once the
   * file has been dealt with, not on reading: while the summary is up, the
   * control still names the file it describes.
   */
  function clearChosenFile() {
    if (inputRef.current) inputRef.current.value = ''
  }

  async function describeFile(file: File) {
    try {
      const reviews = parseJournal(await file.text())
      setPending({ reviews, summary: summariseJournal(reviews, await loadReviews()) })
      setOutcome(null)
    } catch (error) {
      setPending(null)
      clearChosenFile()
      setOutcome({
        kind: 'error',
        message:
          error instanceof JournalFileError ? error.message : "Ce fichier n'a pas pu être lu.",
      })
    }
  }

  async function confirmImport(reviews: ReviewEvent[]) {
    setPending(null)
    clearChosenFile()
    try {
      const { added, total } = await importJournal(reviews, scheduler)
      setOutcome({
        kind: 'ok',
        message:
          added === 0
            ? `Rien de nouveau : cet appareil avait déjà ces ${count(total, 'révision')}.`
            : `${count(added, 'révision')} ajoutée${added > 1 ? 's' : ''}. Vous en avez ${total} en tout.`,
      })
      onImported()
    } catch {
      setOutcome({
        kind: 'error',
        message: "L'import a échoué : le fichier n'a pas pu être enregistré.",
      })
    }
  }

  return (
    <section aria-labelledby="backup-heading" className="border-line mt-12 border-t pt-8">
      <h3 id="backup-heading" className="font-serif text-answer">
        Sauvegarder ou transférer
      </h3>
      <p className="text-muted text-note mt-2">
        Le fichier contient vos révisions, pas votre planning : celui-ci est recalculé à l’import.
        Deux fichiers se combinent, ils ne s’écrasent pas — vous pouvez donc rapprocher deux
        appareils sans rien perdre.
      </p>
      {/* Said here rather than left to be discovered: the file is not just
          numbers, and sending it somewhere sends the writing with it. */}
      <p className="text-muted text-note mt-2">
        Il contient aussi ce que vous avez écrit dans les champs «&nbsp;Pourquoi&nbsp;?&nbsp;».
      </p>

      <div className="mt-6">
        <button type="button" onClick={exportJournal} className={BUTTON}>
          Exporter mes révisions
        </button>
      </div>

      <div className="mt-6">
        <label htmlFor={inputId} className="text-label block font-semibold">
          Importer un fichier
        </label>
        {/*
          A real file input, styled rather than hidden behind a button that
          forwards a click. The usual replacement loses the focus ring and the
          keyboard behaviour the native control already has. Its wording comes
          from the browser, not from us — a French browser says it in French.
        */}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className={
            'text-note mt-2 block w-full max-w-full ' +
            'file:border-muted file:rounded-button file:text-label file:text-ink file:mr-3 ' +
            'file:cursor-pointer file:border file:bg-transparent file:px-5 file:py-3 file:font-semibold'
          }
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void describeFile(file)
          }}
        />
      </div>

      {pending && (
        <div
          role="group"
          aria-labelledby="pending-heading"
          className="border-line mt-6 border-t pt-6"
        >
          <h4 id="pending-heading" className="text-label font-semibold">
            Ce que contient ce fichier
          </h4>
          <ul className="text-body mt-2 list-disc pl-5">
            <li>
              {count(pending.summary.reviews, 'révision')}, sur{' '}
              {count(pending.summary.cards, 'carte')}
            </li>
            <li>{period(pending.summary.from, pending.summary.to)}</li>
            <li>
              {pending.summary.fresh === 0
                ? 'aucune que cet appareil ne connaisse déjà'
                : `${count(pending.summary.fresh, 'révision')} que cet appareil n’a pas`}
            </li>
          </ul>
          <p className="text-muted text-note mt-3">
            Les révisions seront ajoutées aux vôtres et le planning recalculé. Cela ne peut pas être
            annulé.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={PRIMARY}
              onClick={() => void confirmImport(pending.reviews)}
            >
              Fusionner
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                setPending(null)
                clearChosenFile()
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {outcome && (
        <p
          role="status"
          className={`text-note mt-4 ${outcome.kind === 'error' ? 'text-ink font-semibold' : 'text-muted'}`}
        >
          {outcome.message}
        </p>
      )}
    </section>
  )
}
