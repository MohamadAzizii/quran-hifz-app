import { createClient } from '@supabase/supabase-js'
import { addDays, format, parseISO } from 'date-fns'
import 'dotenv/config'

// One-time repair: memorised pages that graduated before the scheduling fix
// kept interval_days=1 / repetitions=0, so they all came due on the same day.
// This re-spreads them so no single day is crammed: pages are ordered weakest
// first (weak material returns soonest), then packed onto days up to a daily
// cap, with a per-band minimum so stronger pages are pushed further out.
// Bands match the My Quran grid colours (>=3 strong, >=2 okay, else weak).
//
// Tune the daily load with REVISION_DAILY_CAP (default 8). Re-runnable.

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running.')
  process.exit(1)
}

const CAP = Number(process.env.REVISION_DAILY_CAP ?? 8)

const supabase = createClient(url, serviceKey)

// Earliest day-offset (from today) a page may be scheduled, by strength band.
function minOffset(strength: number): number {
  if (strength >= 3) return 14
  if (strength >= 2) return 7
  return 2
}

async function main() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayDate = parseISO(today)

  const { data: rows, error } = await supabase
    .from('user_pages')
    .select('*')
    .eq('status', 'memorised')
  if (error) throw error
  if (!rows || rows.length === 0) {
    console.log('No memorised pages found. Nothing to do.')
    return
  }

  console.log(`Re-spreading ${rows.length} memorised pages (cap ${CAP}/day)…`)

  // Weakest first so they get the soonest slots; page_number for stable order.
  const sorted = [...rows].sort(
    (a, b) => a.strength - b.strength || a.page_number - b.page_number
  )

  const dayCounts = new Map<number, number>()
  let cursor = 0
  const updated = sorted.map((p) => {
    let day = Math.max(cursor, minOffset(p.strength))
    while ((dayCounts.get(day) ?? 0) >= CAP) day++
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
    cursor = day
    return {
      ...p,
      interval_days: day,
      next_review_date: format(addDays(todayDate, day), 'yyyy-MM-dd'),
      repetitions: Math.max(2, p.repetitions ?? 0),
    }
  })

  const byDate = new Map<string, number>()
  for (const p of updated) {
    byDate.set(p.next_review_date, (byDate.get(p.next_review_date) ?? 0) + 1)
  }
  console.log('New review-date distribution:')
  for (const [date, count] of [...byDate.entries()].sort()) {
    console.log(`  ${date}: ${count}`)
  }

  for (let i = 0; i < updated.length; i += 500) {
    const chunk = updated.slice(i, i + 500)
    const { error: upErr } = await supabase
      .from('user_pages')
      .upsert(chunk, { onConflict: 'user_id,page_number' })
    if (upErr) throw upErr
  }

  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
