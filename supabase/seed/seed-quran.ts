import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

interface CloudAyah {
  number: number // global ordinal 1..6236
  text: string
  numberInSurah: number
  juz: number
  page: number
  hizbQuarter: number
  surah: { number: number; englishName: string; name: string }
}

async function fetchAllAyahs(): Promise<CloudAyah[]> {
  const endpoint = 'https://api.alquran.cloud/v1/quran/quran-uthmani'
  const res = await fetch(endpoint)
  if (!res.ok) throw new Error(`alquran.cloud returned ${res.status}`)
  const json = await res.json()
  const out: CloudAyah[] = []
  for (const surah of json.data.surahs) {
    for (const a of surah.ayahs) {
      out.push({
        number: a.number,
        text: a.text,
        numberInSurah: a.numberInSurah,
        juz: a.juz,
        page: a.page,
        hizbQuarter: a.hizbQuarter,
        surah: { number: surah.number, englishName: surah.englishName, name: surah.name },
      })
    }
  }
  return out
}

function ayahKey(a: CloudAyah): string {
  return `${a.surah.number}:${a.numberInSurah}`
}

async function main() {
  console.log('Fetching full Quran from alquran.cloud…')
  const ayahs = await fetchAllAyahs()
  const pageCount = new Set(ayahs.map((a) => a.page)).size
  console.log(`Got ${ayahs.length} ayahs across ${pageCount} pages`)

  const byPage = new Map<number, CloudAyah[]>()
  for (const a of ayahs) {
    const arr = byPage.get(a.page) ?? []
    arr.push(a)
    byPage.set(a.page, arr)
  }

  const pagesRows = Array.from(byPage.entries())
    .map(([page_number, list]) => ({
      page_number,
      juz: list[0].juz,
      hizb: Math.ceil(list[0].hizbQuarter / 4),
      surah_name: list[0].surah.englishName,
      first_ayah: ayahKey(list[0]),
      last_ayah: ayahKey(list[list.length - 1]),
    }))
    .sort((a, b) => a.page_number - b.page_number)

  console.log(`Upserting ${pagesRows.length} pages rows…`)
  for (let i = 0; i < pagesRows.length; i += 500) {
    const chunk = pagesRows.slice(i, i + 500)
    const { error } = await supabase.from('pages').upsert(chunk)
    if (error) throw error
  }

  const ayahRows = ayahs.map((a) => ({
    page_number: a.page,
    ayah_key: ayahKey(a),
    ayah_ordinal: a.number,
    text_uthmani: a.text,
  }))

  console.log(`Upserting ${ayahRows.length} ayah_cache rows in chunks…`)
  for (let i = 0; i < ayahRows.length; i += 500) {
    const chunk = ayahRows.slice(i, i + 500)
    const { error } = await supabase
      .from('ayah_cache')
      .upsert(chunk, { onConflict: 'page_number,ayah_key' })
    if (error) throw error
    if (i % 2000 === 0) console.log(`  ${i + chunk.length} / ${ayahRows.length}`)
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
