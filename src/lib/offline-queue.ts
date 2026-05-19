import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'

export interface QueuedMutation {
  id?: number
  table: string
  operation: 'insert' | 'update' | 'upsert'
  payload: Record<string, unknown> & { _filter?: Record<string, unknown> }
  timestamp: number
}

let dbPromise: Promise<IDBPDatabase> | null = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('hifz-offline', 1, {
      upgrade(d) {
        d.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbPromise
}

function stripFilter(payload: QueuedMutation['payload']) {
  const { _filter, ...rest } = payload
  return rest
}

export async function enqueueMutation(op: Omit<QueuedMutation, 'id' | 'timestamp'>) {
  const db = await getDB()
  await db.add('queue', { ...op, timestamp: Date.now() })
}

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  const db = await getDB()
  const ops = (await db.getAll('queue')) as QueuedMutation[]
  let ok = 0
  let failed = 0
  for (const op of ops) {
    let error: { message: string } | null = null
    if (op.operation === 'insert') {
      ;({ error } = await supabase.from(op.table).insert(stripFilter(op.payload)))
    } else if (op.operation === 'upsert') {
      ;({ error } = await supabase.from(op.table).upsert(stripFilter(op.payload)))
    } else if (op.operation === 'update') {
      const filter = op.payload._filter ?? {}
      let q = supabase.from(op.table).update(stripFilter(op.payload))
      for (const [k, v] of Object.entries(filter)) {
        q = q.eq(k, v as string | number)
      }
      ;({ error } = await q)
    }
    if (error) {
      failed++
      continue
    }
    if (op.id != null) await db.delete('queue', op.id)
    ok++
  }
  return { ok, failed }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch(console.error)
  })
}
