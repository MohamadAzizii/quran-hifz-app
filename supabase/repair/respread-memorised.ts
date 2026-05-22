import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import 'dotenv/config'
import { scheduleForStrength } from '../../src/lib/sm2'

// One-time repair: memorised pages that graduated before the scheduling fix
// kept interval_days=1 / repetitions=0, so they all came due on the same day.
// This re-spreads them by strength (weaker sooner, stronger later) and bumps
// repetitions so future "okay" ratings extend the interval instead of resetting
// it to tomorrow.

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: rows, error } = await supabase
    .from('user_pages')
    .select('*')
    .eq('status', 'memorised')
  if (error) throw error
  if (!rows || rows.length === 0) {
    console.log('No memorised pages found. Nothing to do.')
    return
  }

  console.log(`Re-spreading ${rows.length} memorised pages…`)

  const updated = rows.map((p) => {
    const { interval_days, next_review_date } = scheduleForStrength(
      p.strength,
      p.page_number,
      today
    )
    return {
      ...p,
      interval_days,
      next_review_date,
      repetitions: Math.max(2, p.repetitions ?? 0),
    }
  })

  // Quick distribution summary so you can sanity-check the spread.
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
