// One-shot reset: wipe all progress (memorisation, sessions, rep logs) so the
// user can start fresh. Preferences in user_settings are left alone — change
// those via the Settings screen if you also want them reset.
//
// This is a personal-app helper: it deletes every row in the progress tables
// (the personal app only has one user). Don't run on a multi-tenant project
// without scoping to a user_id.

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
  console.error(
    'Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before running.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

// Deletion order respects foreign keys: ratings hang off sessions.
const TABLES = ['session_ratings', 'sessions', 'user_pages'] as const

async function countRows(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function main() {
  console.log('Current row counts:')
  for (const t of TABLES) {
    console.log(`  ${t.padEnd(18)}  ${await countRows(t)}`)
  }

  console.log('\nDeleting…')
  for (const t of TABLES) {
    const { error, count } = await supabase
      .from(t)
      .delete({ count: 'exact' })
      // No real row has the all-zero UUID; this matches every row.
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    console.log(`  ${t.padEnd(18)}  deleted ${count ?? 0}`)
  }

  console.log('\nDone. Re-add memorisation pages from the surah picker in the app.')
  console.log('Tap "Reset device state" in Settings to clear the local cursors.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
