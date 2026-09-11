import { useId, useRef, useState } from 'react'
import { JournalFileError, parseJournal, serialiseJournal } from '../domain/journal'
import type { Scheduler } from '../domain/scheduler'
import { importJournal, loadReviews } from '../data/repository'

export interface BackupProps {
  scheduler: Scheduler
  /** Called after a successful import, so the dashboard reflects the new state. */
  onImported: () => void
}

type Outcome = { kind: 'ok' | 'error'; message: string } | null

const BUTTON = 'min-h-12 rounded-button border-muted text-label border px-5 py-2 font-semibold'

function downloadName(now: Date): string {
  const [date] = now.toISOString().split('T')
  return `reperes-${date}.json`
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

  async function importFile(file: File) {
    try {
      const { added, total } = await importJournal(parseJournal(await file.text()), scheduler)
      setOutcome({
        kind: 'ok',
        message:
          added === 0
            ? `Rien de nouveau : ces ${total} révision${total > 1 ? 's' : ''} étaient déjà sur cet appareil.`
            : `${added} révision${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}. Vous en avez ${total} en tout.`,
      })
      onImported()
    } catch (error) {
      setOutcome({
        kind: 'error',
        message:
          error instanceof JournalFileError
            ? error.message
            : "L'import a échoué : le fichier n'a pas pu être enregistré.",
      })
    } finally {
      // Without this, choosing the same file twice in a row is a no-op.
      if (inputRef.current) inputRef.current.value = ''
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
            if (file) void importFile(file)
          }}
        />
      </div>

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
