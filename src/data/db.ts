import Dexie, { type EntityTable } from 'dexie'
import type { CardProgress } from '../domain/types'

/**
 * Everything lives in the browser. v0 has no account, no server and no personal
 * data leaving the device — which is also why it needs no privacy design review
 * to ship. Sync is a later phase with its own decision.
 */
class ReperesDatabase extends Dexie {
  progress!: EntityTable<CardProgress, 'cardId'>

  constructor() {
    super('reperes')
    this.version(1).stores({ progress: 'cardId, updatedAt' })
  }
}

export const db = new ReperesDatabase()
