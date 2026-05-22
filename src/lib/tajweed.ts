import { openDB, type IDBPDatabase } from 'idb'

let dbPromise: Promise<IDBPDatabase> | null = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('hifz-tajweed', 1, {
      upgrade(d) {
        d.createObjectStore('pages', { keyPath: 'page_number' })
      },
    })
  }
  return dbPromise
}

interface TajweedPageRow {
  page_number: number
  byAyahKey: Record<string, string>
  fetchedAt: number
}

interface CloudTajweedAyah {
  text: string
  numberInSurah: number
  surah: { number: number }
}

interface CloudPageResp {
  code: number
  data: { ayahs: CloudTajweedAyah[] }
}

async function fetchPageFromCloud(page_number: number): Promise<Record<string, string>> {
  const res = await fetch(
    `https://api.alquran.cloud/v1/page/${page_number}/quran-tajweed`
  )
  if (!res.ok) throw new Error(`alquran.cloud returned ${res.status}`)
  const json = (await res.json()) as CloudPageResp
  const out: Record<string, string> = {}
  for (const a of json.data.ayahs) {
    out[`${a.surah.number}:${a.numberInSurah}`] = a.text
  }
  return out
}

export async function getTajweedForPage(
  page_number: number
): Promise<Record<string, string>> {
  const db = await getDB()
  const cached = (await db.get('pages', page_number)) as TajweedPageRow | undefined
  if (cached) return cached.byAyahKey
  const fresh = await fetchPageFromCloud(page_number)
  await db.put('pages', {
    page_number,
    byAyahKey: fresh,
    fetchedAt: Date.now(),
  })
  return fresh
}

export type TajweedToken = { text: string; cls: string | null }

// alquran.cloud bracket-format codes → CSS class suffix
const CODE_TO_CLASS: Record<string, string> = {
  h: 'ham_wasl',
  s: 'slnt',
  l: 'laam_shamsiyah',
  e: 'end',
  n: 'madda_normal',
  p: 'madda_permissible',
  m: 'madda_necessary',
  o: 'madda_obligatory',
  c: 'madda_obligatory',
  f: 'madda_obligatory',
  w: 'madda_obligatory',
  q: 'qalqalah',
  i: 'iqlab',
  a: 'idgham_with_ghunnah',
  u: 'idgham_without_ghunnah',
  d: 'idgham_mutajanisayn',
  b: 'idgham_mutaqaribayn',
  g: 'ghunnah',
  k: 'ikhfa',
  v: 'ikhfa_shafawi',
}

export function parseTajweed(text: string): TajweedToken[] {
  const tokens: TajweedToken[] = []
  const re = /\[([a-z])(?::\d+)?\[([^\]]*)\]/g
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      tokens.push({ text: text.slice(lastEnd, m.index), cls: null })
    }
    const code = m[1]
    const cls = CODE_TO_CLASS[code] ?? null
    tokens.push({ text: m[2], cls })
    lastEnd = m.index + m[0].length
  }
  if (lastEnd < text.length) {
    tokens.push({ text: text.slice(lastEnd), cls: null })
  }
  return tokens
}
