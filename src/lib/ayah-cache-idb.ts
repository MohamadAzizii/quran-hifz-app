import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'
import type { AyahCache } from '../types'

let dbPromise: Promise<IDBPDatabase> | null = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('hifz-ayahs', 1, {
      upgrade(d) {
        const store = d.createObjectStore('ayahs', {
          keyPath: ['page_number', 'ayah_key'],
        })
        store.createIndex('by_page', 'page_number')
      },
    })
  }
  return dbPromise
}

export async function getAyahsForPage(page_number: number): Promise<AyahCache[]> {
  const db = await getDB()
  const local = (await db.getAllFromIndex('ayahs', 'by_page', page_number)) as AyahCache[]
  if (local.length > 0) {
    return local.sort((a, b) => a.ayah_ordinal - b.ayah_ordinal)
  }
  const { data, error } = await supabase
    .from('ayah_cache')
    .select('*')
    .eq('page_number', page_number)
    .order('ayah_ordinal')
  if (error) throw error
  const rows = (data ?? []) as AyahCache[]
  const tx = db.transaction('ayahs', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
  return rows
}
