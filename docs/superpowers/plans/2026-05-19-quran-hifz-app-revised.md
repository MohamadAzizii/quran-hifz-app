# Quran Hifz App — Revised Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Supersedes** parts of `2026-05-19-quran-hifz-app.md` as noted in the mapping table below. Read this plan alongside the original; this is a delta, not a full replacement.

**Goal:** Fix critical bugs and architectural issues in the original plan, and add partial-page (¼ / ½ / 1 / 2) memorisation support.

**Architecture changes:**
- `user_pages` gains `progress_ayah_key` (where you are inside a learning page) and `graduated_to_recent_at` (timer for auto-graduation to `memorised`).
- `ayah_cache` gains `ayah_ordinal` (numeric column) so ayahs sort correctly.
- TanStack Query replaces hand-rolled `useState + useEffect` data hooks — a single shared cache, optimistic updates, retries, refetch on focus.
- Seed from one bulk fetch (`alquran.cloud`) rather than 604 sequential calls.
- Offline queue is wired into every mutation, not defined as dead code.
- Auto-graduate `recent → memorised` after `recent_cycle_days` elapses with healthy strength.
- All data hooks fetch the joined `pages` row so `juz` / `hizb` / `surah_name` are available everywhere.

**New tech:** `@tanstack/react-query`, `zod`

**Out of scope (explicitly excluded by user):** mushaf-edition switching (Madinah-only), mutashabihat tracking, audio playback, teacher / halaqa mode, prayer-time reminders.

---

## Mapping: revised tasks ↔ original tasks

| Revised | Replaces / modifies in original |
|---|---|
| R1: Migration v002 (new columns, ordinal, indices) | Extends Task 3 |
| R2: Tooling — TanStack Query, Zod, error boundary | Extends Task 1 |
| R3: Env-var validation + supabase wrapper | Replaces Task 3 step 3 |
| R4: Seed from Tanzil/alquran.cloud bulk | Replaces Task 4 |
| R5: SM-2 interval clamp + tests | Extends Task 6 |
| R6: Data hooks via TanStack Query | Replaces Task 8 |
| R7: `useAyahCache` with IndexedDB + ordinal sort | Replaces Task 8 step 4 |
| R8: Auto-graduate recent → memorised | New |
| R9: Partial-page support in MemorisationSession | Replaces Task 11 |
| R10: `JuzStrengthMap` fix + Dashboard juz label fix | Replaces Task 9 step 8, Task 10 step 1 |
| R11: RevisionSession — StrictMode + reveal-gate | Replaces Task 12 |
| R12: Offline queue wired into mutations | Extends Task 15 |
| R13: Date-rollover + service worker update prompt + a11y | New |
| R14: Extended test suite | Extends Task 16 |

If you have already executed any original task that R-N supersedes, apply R-N's changes on top.

---

## File structure additions / changes

```
quran-hifz-app/
├── src/
│   ├── lib/
│   │   ├── env.ts                  # NEW — Zod-validated env vars
│   │   ├── queryClient.ts          # NEW — TanStack QueryClient
│   │   ├── ayah-utils.ts           # NEW — verse-key parsing, ordinal
│   │   ├── auto-graduate.ts        # NEW — recent → memorised rule
│   │   ├── ayah-cache-idb.ts       # NEW — IDB-backed ayah store
│   │   └── offline-queue.ts        # MODIFIED — used by hooks
│   ├── hooks/
│   │   ├── usePages.ts             # NEW — reference table cache
│   │   ├── useUserPages.ts         # REPLACED — React Query
│   │   ├── useTodaysTasks.ts       # MODIFIED — date-rollover safe
│   │   ├── useAyahCache.ts         # REPLACED — IDB-backed
│   │   ├── useSession.ts           # MODIFIED — strict-mode safe
│   │   └── useAutoGraduate.ts      # NEW
│   ├── components/
│   │   ├── ErrorBoundary.tsx       # NEW
│   │   ├── UpdatePrompt.tsx        # NEW — service worker update UI
│   │   └── JuzStrengthMap.tsx      # REPLACED — uses joined juz
│   ├── screens/
│   │   ├── MemorisationSession.tsx # REPLACED — partial-page flow
│   │   └── RevisionSession.tsx     # MODIFIED — reveal gate + strict mode
│   └── App.tsx                     # MODIFIED — provider + boundary
├── supabase/
│   ├── migrations/002_progress_and_ordinal.sql   # NEW
│   └── seed/seed-quran.ts          # REPLACED — bulk fetch
```

---

## Task R1: Migration v002 — partial-page + ordinal + types

**Files:**
- Create: `supabase/migrations/002_progress_and_ordinal.sql`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/002_progress_and_ordinal.sql

-- Partial-page progress within a learning page
alter table user_pages
  add column if not exists progress_ayah_key text,
  add column if not exists graduated_to_recent_at timestamptz;

-- Numeric ordinal for stable ayah ordering (string ayah_key sorts "2:10" before "2:2")
alter table ayah_cache
  add column if not exists ayah_ordinal integer;

create index if not exists ayah_cache_page_ordinal_idx
  on ayah_cache (page_number, ayah_ordinal);

create index if not exists user_pages_user_status_idx
  on user_pages (user_id, status);

create index if not exists user_pages_user_review_idx
  on user_pages (user_id, next_review_date);
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Paste and execute. Confirm no errors. Run:

```sql
select column_name from information_schema.columns
where table_name = 'user_pages' and column_name in ('progress_ayah_key','graduated_to_recent_at');
```

Expected: both columns returned.

- [ ] **Step 3: Update `UserPage` and `AyahCache` types**

In `src/types/index.ts`, extend `UserPage` and `AyahCache`:

```ts
export interface UserPage {
  id: string
  user_id: string
  page_number: number
  status: PageStatus
  strength: number
  interval_days: number
  repetitions: number
  next_review_date: string
  last_reviewed_at: string | null
  progress_ayah_key: string | null
  graduated_to_recent_at: string | null
}

export interface AyahCache {
  page_number: number
  ayah_key: string
  ayah_ordinal: number
  text_uthmani: string
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_progress_and_ordinal.sql src/types/index.ts
git commit -m "feat: migration 002 — partial-page progress + ayah ordinal"
```

---

## Task R2: Tooling — TanStack Query, Zod, ErrorBoundary

**Files:**
- Modify: `package.json` (deps)
- Create: `src/lib/queryClient.ts`
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Install deps**

```bash
npm install @tanstack/react-query zod
npm install -D @tanstack/react-query-devtools
```

- [ ] **Step 2: Create QueryClient**

Create `src/lib/queryClient.ts`:

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
})
```

- [ ] **Step 3: Create ErrorBoundary**

Create `src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center gap-4 px-6">
          <div className="text-4xl">⚠️</div>
          <div className="text-lg font-bold">Something went wrong</div>
          <div className="text-sm text-slate-400 text-center max-w-sm">
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); location.reload() }}
            className="bg-blue-600 text-white rounded-xl px-5 py-3 font-semibold"
          >
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: Wrap App with provider + boundary**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './screens/LoginScreen'
import { Dashboard } from './screens/Dashboard'
import { MemorisationSession } from './screens/MemorisationSession'
import { RevisionSession } from './screens/RevisionSession'
import { MyQuran } from './screens/MyQuran'
import { SettingsScreen } from './screens/SettingsScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { queryClient } from './lib/queryClient'

function AuthedRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">Loading…</div>
  }
  if (!user) return <LoginScreen />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/memorise" element={<MemorisationSession />} />
        <Route path="/revise" element={<RevisionSession />} />
        <Route path="/quran" element={<MyQuran />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthedRoutes />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 5: Verify app still renders**

```bash
npm run dev
```

Expected: login screen still loads. React Query Devtools button visible in dev.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queryClient.ts src/components/ErrorBoundary.tsx src/App.tsx package.json package-lock.json
git commit -m "feat: TanStack Query + ErrorBoundary"
```

---

## Task R3: Zod-validated env vars

**Files:**
- Create: `src/lib/env.ts`
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Write env module**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod'

const Env = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
})

const parsed = Env.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('Invalid env:', parsed.error.flatten().fieldErrors)
  throw new Error('Missing or invalid environment variables — see console')
}

export const env = parsed.data
```

- [ ] **Step 2: Use it in supabase client**

Replace `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
```

- [ ] **Step 3: Verify dev still boots**

```bash
npm run dev
```

Expected: no env errors. Temporarily blank a value in `.env.local` and confirm the app shows the ErrorBoundary with a clear message. Restore value.

- [ ] **Step 4: Commit**

```bash
git add src/lib/env.ts src/lib/supabase.ts
git commit -m "feat: Zod-validated env vars"
```

---

## Task R4: Seed from one bulk fetch

The original Task 4 makes 604 sequential API calls (~2 min, fragile to rate limits). Replace with one bulk fetch from `api.alquran.cloud`, then derive page boundaries from the same response.

**Files:**
- Replace: `supabase/seed/seed-quran.ts`

- [ ] **Step 1: Rewrite seed script**

Replace `supabase/seed/seed-quran.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Single endpoint returns the whole Quran with page numbers
// https://alquran.cloud/api — edition `quran-uthmani` gives full diacritics
interface CloudAyah {
  number: number          // global ordinal 1..6236
  text: string
  numberInSurah: number
  juz: number
  page: number
  hizbQuarter: number
  surah: { number: number; englishName: string; name: string }
}

async function fetchAllAyahs(): Promise<CloudAyah[]> {
  const url = 'https://api.alquran.cloud/v1/quran/quran-uthmani'
  const res = await fetch(url)
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
  console.log(`Got ${ayahs.length} ayahs across ${new Set(ayahs.map(a => a.page)).size} pages`)

  // Group by page
  const byPage = new Map<number, CloudAyah[]>()
  for (const a of ayahs) {
    const arr = byPage.get(a.page) ?? []
    arr.push(a)
    byPage.set(a.page, arr)
  }

  // Build pages rows
  const pagesRows = Array.from(byPage.entries()).map(([page_number, list]) => ({
    page_number,
    juz: list[0].juz,
    hizb: Math.ceil(list[0].hizbQuarter / 4),  // hizbQuarter is 1..240, hizb is 1..60
    surah_name: list[0].surah.englishName,
    first_ayah: ayahKey(list[0]),
    last_ayah: ayahKey(list[list.length - 1]),
  })).sort((a, b) => a.page_number - b.page_number)

  console.log(`Upserting ${pagesRows.length} pages rows…`)
  // Supabase has a default 1000-row limit per upsert; chunk it
  for (let i = 0; i < pagesRows.length; i += 500) {
    const chunk = pagesRows.slice(i, i + 500)
    const { error } = await supabase.from('pages').upsert(chunk)
    if (error) throw error
  }

  // Build ayah_cache rows
  const ayahRows = ayahs.map(a => ({
    page_number: a.page,
    ayah_key: ayahKey(a),
    ayah_ordinal: a.number,    // global 1..6236 — guarantees correct sort
    text_uthmani: a.text,
  }))

  console.log(`Upserting ${ayahRows.length} ayah_cache rows in chunks…`)
  for (let i = 0; i < ayahRows.length; i += 500) {
    const chunk = ayahRows.slice(i, i + 500)
    const { error } = await supabase.from('ayah_cache').upsert(chunk, {
      onConflict: 'page_number,ayah_key',
    })
    if (error) throw error
    if (i % 2000 === 0) console.log(`  ${i + chunk.length} / ${ayahRows.length}`)
  }

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run it**

```bash
npx tsx supabase/seed/seed-quran.ts
```

Expected: completes in ~20–40 seconds total (one network round-trip + chunked upserts).

- [ ] **Step 3: Verify ordinal column populated**

In Supabase SQL Editor:

```sql
select count(*) from ayah_cache where ayah_ordinal is null;
-- Expected: 0

select page_number, ayah_key, ayah_ordinal from ayah_cache
where page_number = 2 order by ayah_ordinal limit 10;
-- Expected: rows in surah order, ordinals contiguous
```

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/seed-quran.ts
git commit -m "feat: bulk Quran seed via alquran.cloud"
```

---

## Task R5: SM-2 — clamp interval, add regression tests

**Files:**
- Modify: `src/lib/sm2.ts`
- Modify: `src/lib/sm2.test.ts`

- [ ] **Step 1: Add failing tests for the bugs**

Append to `src/lib/sm2.test.ts`:

```ts
describe('calculateNextReview — regression', () => {
  const today = '2026-05-19'
  const basePage = { strength: 2.5, interval_days: 1, repetitions: 0, next_review_date: today }

  it('never returns interval_days less than 1', () => {
    // With strength clamped low and small interval, rounding could drop to 0
    const result = calculateNextReview(
      { ...basePage, strength: 1.3, interval_days: 1, repetitions: 5 },
      'okay',
      today
    )
    expect(result.interval_days).toBeGreaterThanOrEqual(1)
  })

  it('weak rating from rep 0 still increases strength penalty', () => {
    // Sanity: weak must reduce strength below starting value
    const result = calculateNextReview(basePage, 'weak', today)
    expect(result.strength).toBeLessThan(2.5)
  })

  it('next_review_date is computed in UTC-safe way', () => {
    // Crossing month boundary
    const result = calculateNextReview(
      { ...basePage, repetitions: 1, interval_days: 1 },
      'okay',
      '2026-05-30'
    )
    // okay at rep 1 sets interval to 6 → 2026-06-05
    expect(result.next_review_date).toBe('2026-06-05')
  })
})
```

- [ ] **Step 2: Run, expect first test to fail**

```bash
npx vitest run src/lib/sm2.test.ts
```

Expected: `never returns interval_days less than 1` fails (returns 0 or negative in edge cases).

- [ ] **Step 3: Fix sm2.ts**

In `src/lib/sm2.ts`, change the line computing `interval_days = Math.round(interval_days * strength)` to clamp:

```ts
import { addDays, format, parseISO } from 'date-fns'
import type { Rating, SM2Result } from '../types'

interface PageSM2State {
  strength: number
  interval_days: number
  repetitions: number
  next_review_date: string
}

const QUALITY: Record<Rating, number> = { weak: 1, okay: 3, strong: 5 }

export function calculateNextReview(
  page: PageSM2State,
  rating: Rating,
  today: string
): SM2Result {
  const q = QUALITY[rating]
  let { strength, interval_days, repetitions } = page

  if (q >= 3) {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.max(1, Math.round(interval_days * strength))
    repetitions += 1
  } else {
    repetitions = 0
    interval_days = 1
  }

  strength = Math.max(1.3, strength + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  // parseISO avoids timezone surprises that `new Date('2026-05-19')` brings
  const next_review_date = format(addDays(parseISO(today), interval_days), 'yyyy-MM-dd')

  return { strength, interval_days, repetitions, next_review_date }
}
```

- [ ] **Step 4: Verify all tests pass**

```bash
npx vitest run src/lib/sm2.test.ts
```

Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sm2.ts src/lib/sm2.test.ts
git commit -m "fix: SM-2 interval clamp + timezone-safe date math"
```

---

## Task R6: Replace data hooks with TanStack Query

The original `useUserPages` creates a separate state instance per call site, so the Dashboard, MyQuran, MemorisationSession, and RevisionSession each fetch independently and drift. Replace with shared TanStack Query state.

**Files:**
- Create: `src/hooks/usePages.ts`
- Replace: `src/hooks/useUserPages.ts`
- Replace: `src/hooks/useTodaysTasks.ts`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/hooks/useSession.ts`

- [ ] **Step 1: `usePages` — reference table**

Create `src/hooks/usePages.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { QuranPage } from '../types'

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: async (): Promise<QuranPage[]> => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('page_number')
      if (error) throw error
      return data ?? []
    },
    staleTime: Infinity,  // never changes
  })
}
```

- [ ] **Step 2: Replace `useUserPages`**

Replace `src/hooks/useUserPages.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { calculateNextReview } from '../lib/sm2'
import { enqueueMutation } from '../lib/offline-queue'
import type { UserPage, PageStatus, Rating, QuranPage } from '../types'

export type UserPageWithMeta = UserPage & { pages: Pick<QuranPage, 'juz' | 'hizb' | 'surah_name'> }

export function useUserPagesQuery() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user_pages', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserPageWithMeta[]> => {
      const { data, error } = await supabase
        .from('user_pages')
        .select('*, pages!inner(juz, hizb, surah_name)')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? []) as UserPageWithMeta[]
    },
  })
}

export function useAddPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (page_number: number) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const payload = {
        user_id: user.id,
        page_number,
        status: 'learning' as PageStatus,
        strength: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_date: today,
        progress_ayah_key: null,
      }
      if (!navigator.onLine) {
        await enqueueMutation({ table: 'user_pages', operation: 'insert', payload })
        return null
      }
      const { data, error } = await supabase.from('user_pages').insert(payload).select('*, pages!inner(juz, hizb, surah_name)').single()
      if (error) throw error
      return data as UserPageWithMeta
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useAdvanceProgress() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page_number: number; progress_ayah_key: string | null; graduate?: boolean }) => {
      if (!user) throw new Error('not signed in')
      const updates: Partial<UserPage> = {
        progress_ayah_key: args.progress_ayah_key,
        last_reviewed_at: new Date().toISOString(),
      }
      if (args.graduate) {
        updates.status = 'recent'
        updates.graduated_to_recent_at = new Date().toISOString()
        updates.next_review_date = format(new Date(), 'yyyy-MM-dd')
      }
      const op = {
        table: 'user_pages',
        operation: 'update' as const,
        payload: { ...updates, _filter: { user_id: user.id, page_number: args.page_number } },
      }
      if (!navigator.onLine) { await enqueueMutation(op); return }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page_number)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useApplyRating() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page: UserPageWithMeta; rating: Rating }) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const sm2 = calculateNextReview(args.page, args.rating, today)
      const updates = { ...sm2, last_reviewed_at: new Date().toISOString() }
      const op = {
        table: 'user_pages',
        operation: 'update' as const,
        payload: { ...updates, _filter: { user_id: user.id, page_number: args.page.page_number } },
      }
      if (!navigator.onLine) { await enqueueMutation(op); return }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page.page_number)
      if (error) throw error
    },
    // Optimistic update
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['user_pages', user?.id] })
      const prev = qc.getQueryData<UserPageWithMeta[]>(['user_pages', user?.id])
      qc.setQueryData<UserPageWithMeta[]>(['user_pages', user?.id], (old) => {
        if (!old) return old
        const sm2 = calculateNextReview(args.page, args.rating, format(new Date(), 'yyyy-MM-dd'))
        return old.map(p => p.page_number === args.page.page_number ? { ...p, ...sm2 } : p)
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_pages', user?.id], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}

export function useGraduatePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { page_number: number; to: PageStatus }) => {
      if (!user) throw new Error('not signed in')
      const today = format(new Date(), 'yyyy-MM-dd')
      const updates: Partial<UserPage> = {
        status: args.to,
        last_reviewed_at: new Date().toISOString(),
        ...(args.to === 'recent'
          ? { graduated_to_recent_at: new Date().toISOString(), next_review_date: today, progress_ayah_key: null }
          : {}),
      }
      const { error } = await supabase
        .from('user_pages')
        .update(updates)
        .eq('user_id', user.id)
        .eq('page_number', args.page_number)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_pages', user?.id] }),
  })
}
```

- [ ] **Step 3: Replace `useTodaysTasks` with date-rollover safety**

Replace `src/hooks/useTodaysTasks.ts`:

```ts
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { computeTodaysTasks } from '../lib/today-tasks'
import { useUserPagesQuery } from './useUserPages'

function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function useTodaysTasks() {
  const { data: pages = [], isLoading } = useUserPagesQuery()
  const [today, setToday] = useState(todayString)

  // Rollover if app stays open across midnight
  useEffect(() => {
    const tick = () => {
      const t = todayString()
      setToday(prev => (prev === t ? prev : t))
    }
    const interval = setInterval(tick, 60_000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [])

  const tasks = useMemo(() => computeTodaysTasks(pages, today), [pages, today])
  return { tasks, loading: isLoading, today }
}
```

- [ ] **Step 4: Migrate `useSettings` to TanStack Query**

Replace body of `src/hooks/useSettings.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { UserSettings } from '../types'

const DEFAULTS: Omit<UserSettings, 'user_id'> = {
  daily_target: 'half',
  memorisation_reps_mushaf: 12,
  memorisation_reps_memory: 8,
  recent_cycle_days: 3,
  notifications_enabled: true,
  daily_reminder_time: '08:00',
}

export function useSettings() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['user_settings', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserSettings> => {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', user!.id).maybeSingle()
      if (data) return data as UserSettings
      const { data: created, error } = await supabase
        .from('user_settings')
        .insert({ user_id: user!.id, ...DEFAULTS })
        .select().single()
      if (error) throw error
      return created as UserSettings
    },
  })

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
      if (!user) throw new Error('not signed in')
      const { error } = await supabase.from('user_settings').update(updates).eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['user_settings', user?.id] })
      const prev = qc.getQueryData<UserSettings>(['user_settings', user?.id])
      if (prev) qc.setQueryData<UserSettings>(['user_settings', user?.id], { ...prev, ...updates })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['user_settings', user?.id], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user_settings', user?.id] }),
  })

  return { settings: query.data, updateSettings: mutation.mutate }
}
```

- [ ] **Step 5: Make `useSession` StrictMode-safe**

Replace body of `src/hooks/useSession.ts`:

```ts
import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SessionType, Rating } from '../types'

export function useSession() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const startInFlight = useRef<Promise<string | null> | null>(null)

  const startSession = async (type: SessionType): Promise<string | null> => {
    if (sessionId) return sessionId
    if (startInFlight.current) return startInFlight.current
    if (!user) return null

    startInFlight.current = (async () => {
      const { data, error } = await supabase.from('sessions').insert({
        user_id: user.id, type, started_at: new Date().toISOString(), total_pages: 0,
      }).select().single()
      if (error || !data) return null
      setSessionId(data.id)
      return data.id
    })()

    const id = await startInFlight.current
    startInFlight.current = null
    return id
  }

  const logRating = async (page_number: number, rating: Rating, reps: { reps_revision?: number }) => {
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId, page_number, rating,
      reps_with_mushaf: 0, reps_from_memory: 0, reps_revision: reps.reps_revision ?? 0,
    })
  }

  const logMemorisation = async (page_number: number, reps_with_mushaf: number, reps_from_memory: number) => {
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId, page_number, rating: null, reps_with_mushaf, reps_from_memory, reps_revision: 0,
    })
  }

  const completeSession = async (total_pages: number) => {
    if (!sessionId) return
    await supabase.from('sessions').update({
      completed_at: new Date().toISOString(), total_pages,
    }).eq('id', sessionId)
    setSessionId(null)
  }

  return { sessionId, startSession, logRating, logMemorisation, completeSession }
}
```

- [ ] **Step 6: Update call sites in Dashboard / MyQuran**

Replace any `const { pages } = useUserPages()` with `const { data: pages = [] } = useUserPagesQuery()`, and `addPage`/`graduatePage`/`applyRating` with their mutation hooks (e.g., `const addPage = useAddPage()` → call with `addPage.mutate(pageNumber)`).

Concretely, in `src/screens/Dashboard.tsx` change:

```ts
const { pages, loading: pagesLoading } = useUserPages()
```

to:

```ts
import { useUserPagesQuery } from '../hooks/useUserPages'
const { data: pages = [], isLoading: pagesLoading } = useUserPagesQuery()
```

In `src/screens/MyQuran.tsx`, change:

```ts
const { pages, graduatePage } = useUserPages()
```

to:

```ts
import { useUserPagesQuery, useGraduatePage } from '../hooks/useUserPages'
const { data: pages = [] } = useUserPagesQuery()
const graduate = useGraduatePage()
// usage: graduate.mutate({ page_number, to: status })
```

- [ ] **Step 7: Verify**

```bash
npm run dev
```

Open the app. Dashboard, MyQuran, Settings all load and stay in sync after any mutation. Open React Query Devtools and confirm a single `['user_pages', userId]` cache entry, not many.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/ src/screens/Dashboard.tsx src/screens/MyQuran.tsx
git commit -m "refactor: TanStack Query data layer with optimistic updates"
```

---

## Task R7: IDB-backed ayah cache with correct ordering

**Files:**
- Create: `src/lib/ayah-cache-idb.ts`
- Create: `src/lib/ayah-utils.ts`
- Replace: `src/hooks/useAyahCache.ts`

- [ ] **Step 1: Ayah utils**

Create `src/lib/ayah-utils.ts`:

```ts
export function parseAyahKey(key: string): { surah: number; ayah: number } {
  const [s, a] = key.split(':').map(n => parseInt(n, 10))
  return { surah: s, ayah: a }
}

export function compareAyahKeys(a: string, b: string): number {
  const pa = parseAyahKey(a), pb = parseAyahKey(b)
  return pa.surah !== pb.surah ? pa.surah - pb.surah : pa.ayah - pb.ayah
}
```

- [ ] **Step 2: IDB ayah store**

Create `src/lib/ayah-cache-idb.ts`:

```ts
import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'
import type { AyahCache } from '../types'

interface AyahRow extends AyahCache { ayah_ordinal: number }

let dbPromise: Promise<IDBPDatabase> | null = null
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('hifz-ayahs', 1, {
      upgrade(d) {
        const store = d.createObjectStore('ayahs', { keyPath: ['page_number', 'ayah_key'] })
        store.createIndex('by_page', 'page_number')
      },
    })
  }
  return dbPromise
}

export async function getAyahsForPage(page_number: number): Promise<AyahRow[]> {
  const db = await getDB()
  const local = (await db.getAllFromIndex('ayahs', 'by_page', page_number)) as AyahRow[]
  if (local.length > 0) {
    return local.sort((a, b) => a.ayah_ordinal - b.ayah_ordinal)
  }
  const { data, error } = await supabase
    .from('ayah_cache')
    .select('*')
    .eq('page_number', page_number)
    .order('ayah_ordinal')
  if (error) throw error
  const rows = (data ?? []) as AyahRow[]
  const tx = db.transaction('ayahs', 'readwrite')
  for (const r of rows) await tx.store.put(r)
  await tx.done
  return rows
}
```

- [ ] **Step 3: Replace `useAyahCache`**

Replace `src/hooks/useAyahCache.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { getAyahsForPage } from '../lib/ayah-cache-idb'

export function useAyahCache(pageNumber: number | null) {
  const query = useQuery({
    queryKey: ['ayahs', pageNumber],
    enabled: pageNumber != null,
    queryFn: () => getAyahsForPage(pageNumber!),
    staleTime: Infinity,
  })
  return { ayahs: query.data ?? [], loading: query.isLoading }
}
```

- [ ] **Step 4: Update `AyahCard` to use ordinal sort (defensive)**

In `src/components/AyahCard.tsx`, change the ayah join line from:

```tsx
{ayahs.map(a => a.text_uthmani).join(' ')}
```

to (sorting once, in case caller forgot):

```tsx
{[...ayahs]
  .sort((a, b) => (a.ayah_ordinal ?? 0) - (b.ayah_ordinal ?? 0))
  .map(a => a.text_uthmani).join(' ')}
```

Also update the `AyahCache` type in `src/types/index.ts`:

```ts
export interface AyahCache {
  page_number: number
  ayah_key: string
  ayah_ordinal: number
  text_uthmani: string
}
```

- [ ] **Step 5: Add ordering test**

Create `src/lib/ayah-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { compareAyahKeys } from './ayah-utils'

describe('compareAyahKeys', () => {
  it('orders within same surah numerically', () => {
    expect(['2:2','2:10','2:1'].sort(compareAyahKeys)).toEqual(['2:1','2:2','2:10'])
  })
  it('orders across surahs', () => {
    expect(['10:1','2:286','3:1'].sort(compareAyahKeys)).toEqual(['2:286','3:1','10:1'])
  })
})
```

Run:

```bash
npx vitest run src/lib/ayah-utils.test.ts
```

Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ayah-cache-idb.ts src/lib/ayah-utils.ts src/lib/ayah-utils.test.ts src/hooks/useAyahCache.ts src/components/AyahCard.tsx src/types/index.ts
git commit -m "feat: IDB-backed ayah cache with ordinal sort"
```

---

## Task R8: Auto-graduate recent → memorised

The original plan never moves pages out of `recent`. Add a client-side rule: after `recent_cycle_days` days in `recent` with strength ≥ 2.5, the page graduates to `memorised`.

**Files:**
- Create: `src/lib/auto-graduate.ts`
- Create: `src/lib/auto-graduate.test.ts`
- Create: `src/hooks/useAutoGraduate.ts`
- Modify: `src/screens/Dashboard.tsx`

- [ ] **Step 1: Failing tests**

Create `src/lib/auto-graduate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pagesToGraduate } from './auto-graduate'
import type { UserPage } from '../types'

const today = '2026-05-19'
function makePage(o: Partial<UserPage>): UserPage {
  return {
    id: '1', user_id: 'u1', page_number: 1, status: 'recent',
    strength: 2.5, interval_days: 1, repetitions: 0,
    next_review_date: today, last_reviewed_at: null,
    progress_ayah_key: null, graduated_to_recent_at: null,
    ...o,
  }
}

describe('pagesToGraduate', () => {
  it('returns empty list when no recent pages exist', () => {
    expect(pagesToGraduate([makePage({ status: 'memorised' })], today, 3)).toEqual([])
  })

  it('graduates a recent page once cycle days have passed', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-15T00:00:00Z' })  // 4 days ago
    expect(pagesToGraduate([p], today, 3).map(x => x.page_number)).toEqual([1])
  })

  it('does NOT graduate if cycle days have not passed', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-18T00:00:00Z' })  // 1 day ago
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })

  it('does NOT graduate if strength dropped below 2.5', () => {
    const p = makePage({ graduated_to_recent_at: '2026-05-10T00:00:00Z', strength: 2.0 })
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })

  it('does NOT graduate if graduated_to_recent_at is null (legacy data)', () => {
    const p = makePage({ graduated_to_recent_at: null })
    expect(pagesToGraduate([p], today, 3)).toEqual([])
  })
})
```

- [ ] **Step 2: Run, expect fail**

```bash
npx vitest run src/lib/auto-graduate.test.ts
```

Expected: FAIL ("pagesToGraduate is not defined").

- [ ] **Step 3: Implement**

Create `src/lib/auto-graduate.ts`:

```ts
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { UserPage } from '../types'

const HEALTH_THRESHOLD = 2.5

export function pagesToGraduate(
  pages: UserPage[],
  today: string,
  recent_cycle_days: number
): UserPage[] {
  const todayDate = parseISO(today)
  return pages.filter(p => {
    if (p.status !== 'recent') return false
    if (!p.graduated_to_recent_at) return false
    if (p.strength < HEALTH_THRESHOLD) return false
    const daysIn = differenceInCalendarDays(todayDate, parseISO(p.graduated_to_recent_at))
    return daysIn >= recent_cycle_days
  })
}
```

- [ ] **Step 4: Tests pass**

```bash
npx vitest run src/lib/auto-graduate.test.ts
```

Expected: 5 PASS.

- [ ] **Step 5: Hook that runs on dashboard mount**

Create `src/hooks/useAutoGraduate.ts`:

```ts
import { useEffect } from 'react'
import { format } from 'date-fns'
import { useUserPagesQuery, useGraduatePage } from './useUserPages'
import { useSettings } from './useSettings'
import { pagesToGraduate } from '../lib/auto-graduate'

export function useAutoGraduate() {
  const { data: pages = [] } = useUserPagesQuery()
  const { settings } = useSettings()
  const graduate = useGraduatePage()

  useEffect(() => {
    if (!settings) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const due = pagesToGraduate(pages, today, settings.recent_cycle_days)
    for (const p of due) {
      graduate.mutate({ page_number: p.page_number, to: 'memorised' })
    }
    // We want this to run once when settings + pages are first loaded together.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, settings?.recent_cycle_days])
}
```

- [ ] **Step 6: Wire into Dashboard**

In `src/screens/Dashboard.tsx`, add at the top of the component body:

```ts
import { useAutoGraduate } from '../hooks/useAutoGraduate'
// …
export function Dashboard() {
  useAutoGraduate()
  // … rest unchanged
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/auto-graduate.ts src/lib/auto-graduate.test.ts src/hooks/useAutoGraduate.ts src/screens/Dashboard.tsx
git commit -m "feat: auto-graduate recent pages to memorised after cycle days"
```

---

## Task R9: Partial-page memorisation flow

Replace the original MemorisationSession with a portion-based flow. The unit is still the page (so SM-2 doesn't change), but inside a learning page the user works through portions of size derived from `daily_target`.

**Files:**
- Create: `src/lib/portion.ts`
- Create: `src/lib/portion.test.ts`
- Replace: `src/screens/MemorisationSession.tsx`

(Types `UserPage.progress_ayah_key` and `AyahCache.ayah_ordinal` were added in R1.)

- [ ] **Step 1: Portion logic — failing tests**

Create `src/lib/portion.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { nextPortion } from './portion'
import type { AyahCache, DailyTarget } from '../types'

function ayahs(keys: string[]): AyahCache[] {
  return keys.map((k, i) => ({ page_number: 1, ayah_key: k, ayah_ordinal: i + 1, text_uthmani: '...' }))
}

describe('nextPortion', () => {
  const page = ayahs(['2:1','2:2','2:3','2:4','2:5','2:6','2:7','2:8'])  // 8 ayahs

  it('quarter target on fresh page returns first 2 ayahs', () => {
    const portion = nextPortion(page, null, 'quarter')
    expect(portion.ayahs.map(a => a.ayah_key)).toEqual(['2:1','2:2'])
    expect(portion.isLastPortion).toBe(false)
  })

  it('half target on fresh page returns first 4 ayahs', () => {
    const portion = nextPortion(page, null, 'half')
    expect(portion.ayahs.map(a => a.ayah_key)).toEqual(['2:1','2:2','2:3','2:4'])
  })

  it('one (full page) target returns whole page', () => {
    const portion = nextPortion(page, null, 'one')
    expect(portion.ayahs).toHaveLength(8)
    expect(portion.isLastPortion).toBe(true)
  })

  it('continues from progress_ayah_key for quarter target', () => {
    // progress points at the last memorised ayah; next portion starts after
    const portion = nextPortion(page, '2:2', 'quarter')
    expect(portion.ayahs.map(a => a.ayah_key)).toEqual(['2:3','2:4'])
  })

  it('marks last portion when remainder is small', () => {
    const portion = nextPortion(page, '2:6', 'quarter')
    expect(portion.ayahs.map(a => a.ayah_key)).toEqual(['2:7','2:8'])
    expect(portion.isLastPortion).toBe(true)
  })

  it('returns empty portion when page is complete', () => {
    const portion = nextPortion(page, '2:8', 'quarter')
    expect(portion.ayahs).toHaveLength(0)
    expect(portion.isLastPortion).toBe(true)
  })

  it('two target on a single page is still capped at end of page', () => {
    const portion = nextPortion(page, null, 'two')
    expect(portion.ayahs).toHaveLength(8)
    expect(portion.isLastPortion).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect fail**

```bash
npx vitest run src/lib/portion.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/portion.ts`:

```ts
import type { AyahCache, DailyTarget } from '../types'

const FRACTIONS: Record<DailyTarget, number> = {
  quarter: 0.25,
  half: 0.5,
  one: 1,
  two: 2,  // capped at 1 page per portion in this function
}

export interface Portion {
  ayahs: AyahCache[]
  isLastPortion: boolean
}

export function nextPortion(
  pageAyahs: AyahCache[],
  progress_ayah_key: string | null,
  daily_target: DailyTarget
): Portion {
  const sorted = [...pageAyahs].sort((a, b) => a.ayah_ordinal - b.ayah_ordinal)
  const startIdx = progress_ayah_key
    ? sorted.findIndex(a => a.ayah_key === progress_ayah_key) + 1
    : 0
  if (startIdx >= sorted.length) {
    return { ayahs: [], isLastPortion: true }
  }
  const portionSize = Math.max(1, Math.ceil(sorted.length * Math.min(1, FRACTIONS[daily_target])))
  const endIdx = Math.min(sorted.length, startIdx + portionSize)
  return {
    ayahs: sorted.slice(startIdx, endIdx),
    isLastPortion: endIdx >= sorted.length,
  }
}
```

- [ ] **Step 4: Tests pass**

```bash
npx vitest run src/lib/portion.test.ts
```

Expected: 7 PASS.

- [ ] **Step 5: Replace MemorisationSession**

Replace `src/screens/MemorisationSession.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPagesQuery, useAddPage, useAdvanceProgress } from '../hooks/useUserPages'
import { useSettings } from '../hooks/useSettings'
import { useAyahCache } from '../hooks/useAyahCache'
import { useSession } from '../hooks/useSession'
import { AyahCard } from '../components/AyahCard'
import { RepCounter } from '../components/RepCounter'
import { nextPortion } from '../lib/portion'

export function MemorisationSession() {
  const navigate = useNavigate()
  const { data: pages = [] } = useUserPagesQuery()
  const addPage = useAddPage()
  const advance = useAdvanceProgress()
  const { settings } = useSettings()
  const { startSession, logMemorisation, completeSession } = useSession()

  const learningPages = pages.filter(p => p.status === 'learning')
  const currentPage = learningPages[0] ?? null

  const { ayahs } = useAyahCache(currentPage?.page_number ?? null)
  const portion = currentPage && settings
    ? nextPortion(ayahs, currentPage.progress_ayah_key, settings.daily_target)
    : null

  const [repsWithMushaf, setRepsWithMushaf] = useState(0)
  const [repsFromMemory, setRepsFromMemory] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)

  const mushafTarget = settings?.memorisation_reps_mushaf ?? 12
  const memoryTarget = settings?.memorisation_reps_memory ?? 8

  if (!settings) return <div className="min-h-screen bg-[#0f1117]" />

  if (!currentPage) {
    const nextPageNum = Math.max(0, ...pages.map(p => p.page_number)) + 1
    return (
      <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm mb-5">← Back</button>
        <h1 className="text-xl font-bold mb-6">New Memorisation</h1>
        <p className="text-slate-400 text-sm mb-6">Start with page {nextPageNum}.</p>
        <button
          onClick={() => addPage.mutate(nextPageNum)}
          disabled={addPage.isPending}
          className="w-full bg-green-700 text-white rounded-2xl py-4 text-base font-bold disabled:opacity-50"
        >
          {addPage.isPending ? 'Adding…' : `Start Page ${nextPageNum}`}
        </button>
      </div>
    )
  }

  const handleStart = async () => {
    await startSession('memorisation')
    setSessionStarted(true)
  }

  const handleFinishPortion = async () => {
    if (!portion || portion.ayahs.length === 0 || !currentPage) return
    const lastAyah = portion.ayahs[portion.ayahs.length - 1]

    await logMemorisation(currentPage.page_number, repsWithMushaf, repsFromMemory)

    if (portion.isLastPortion) {
      // Whole page now memorised → graduate to recent
      await advance.mutateAsync({
        page_number: currentPage.page_number,
        progress_ayah_key: lastAyah.ayah_key,
        graduate: true,
      })
      await completeSession(1)
      navigate('/')
    } else {
      await advance.mutateAsync({
        page_number: currentPage.page_number,
        progress_ayah_key: lastAyah.ayah_key,
      })
      await completeSession(0)
      setRepsWithMushaf(0)
      setRepsFromMemory(0)
      setSessionStarted(false)
    }
  }

  const portionLabel = portion?.ayahs.length
    ? `${portion.ayahs[0].ayah_key} → ${portion.ayahs[portion.ayahs.length - 1].ayah_key}`
    : 'No portion remaining'

  return (
    <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm" aria-label="Back to dashboard">← Back</button>
        <h1 className="text-lg font-bold flex-1">New Memorisation</h1>
        <div className="bg-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-400 font-semibold">Page {currentPage.page_number}</div>
      </div>

      <div className="bg-[#1e293b] rounded-xl p-3 mb-3 text-xs text-slate-400">
        Portion: <span className="text-white font-bold">{portionLabel}</span>
        {' · '}{portion?.isLastPortion ? 'final portion of page' : 'partial'}
      </div>

      <AyahCard
        ayahs={portion?.ayahs ?? []}
        pageNumber={currentPage.page_number}
        surahName={`Page ${currentPage.page_number}`}
        defaultHidden={false}
      />

      {!sessionStarted ? (
        <button
          onClick={handleStart}
          className="w-full bg-green-700 text-white rounded-2xl py-4 text-base font-bold mb-4"
        >
          Start Session
        </button>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">Track Repetitions</div>
          <RepCounter label="📖 With Mushaf" count={repsWithMushaf} target={mushafTarget} color="blue" onAdd={() => setRepsWithMushaf(r => r + 1)} />
          <div className="h-px bg-[#0f172a] my-3" />
          <RepCounter label="🧠 From Memory" count={repsFromMemory} target={memoryTarget} color="purple" onAdd={() => setRepsFromMemory(r => r + 1)} />
        </div>
      )}

      {sessionStarted && (
        <button
          onClick={handleFinishPortion}
          disabled={advance.isPending || (repsWithMushaf < mushafTarget && repsFromMemory < memoryTarget)}
          className="w-full bg-green-700 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
        >
          {portion?.isLastPortion ? '✓ Mark page as memorised' : '✓ Mark portion done'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Verify partial-page flow**

```bash
npm run dev
```

Steps:
1. Sign in, navigate to memorise screen, add page 1.
2. With `daily_target = quarter`, verify only the first 1–2 ayahs show.
3. Log reps to hit either target, tap "Mark portion done".
4. Verify the next portion appears, and the page stays in `learning` until the final portion.
5. On final portion, "Mark page as memorised" appears and graduates to `recent`.
6. Change `daily_target` to `one` in settings, add a new page → whole page shows in one portion.

- [ ] **Step 7: Commit**

```bash
git add src/lib/portion.ts src/lib/portion.test.ts src/screens/MemorisationSession.tsx
git commit -m "feat: partial-page memorisation driven by daily_target"
```

---

## Task R10: Fix JuzStrengthMap and Dashboard "Juz N" label

**Files:**
- Replace: `src/components/JuzStrengthMap.tsx`
- Modify: `src/screens/Dashboard.tsx`

- [ ] **Step 1: Fix JuzStrengthMap to use joined juz field**

Replace `src/components/JuzStrengthMap.tsx`:

```tsx
import type { UserPageWithMeta } from '../hooks/useUserPages'

interface Props {
  userPages: UserPageWithMeta[]
  onJuzClick?: (juz: number) => void
}

function colorForJuz(pages: UserPageWithMeta[]): string {
  if (pages.length === 0) return 'bg-[#0f172a] border border-[#1e293b] text-slate-700'
  if (pages.some(p => p.status === 'learning')) return 'bg-blue-600 text-white'
  const avg = pages.reduce((s, p) => s + p.strength, 0) / pages.length
  if (avg >= 4) return 'bg-green-700 text-white'
  if (avg >= 3) return 'bg-green-500 text-white'
  if (avg >= 2.5) return 'bg-amber-500 text-white'
  if (avg >= 1.8) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

export function JuzStrengthMap({ userPages, onJuzClick }: Props) {
  const byJuz = new Map<number, UserPageWithMeta[]>()
  for (const p of userPages) {
    const list = byJuz.get(p.pages.juz) ?? []
    list.push(p)
    byJuz.set(p.pages.juz, list)
  }

  return (
    <div className="bg-[#1e293b] rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Juz Strength Map</h3>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
          const pages = byJuz.get(juz) ?? []
          return (
            <button
              key={juz}
              onClick={() => onJuzClick?.(juz)}
              aria-label={`Juz ${juz}, ${pages.length} pages in progress`}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold ${colorForJuz(pages)}`}
            >
              {juz}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 flex-wrap mt-3">
        {[
          { color: 'bg-green-500', label: 'Solid' },
          { color: 'bg-amber-500', label: 'Okay' },
          { color: 'bg-red-600', label: 'Weak' },
          { color: 'bg-blue-600', label: 'Learning' },
          { color: 'bg-[#0f172a] border border-[#1e293b]', label: 'Not started' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-sm ${l.color}`} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Fix the bogus "Juz N" label and progress math in Dashboard**

In `src/screens/Dashboard.tsx`:

- Replace the `useUserPages` import with `useUserPagesQuery` (already done in R6 step 6).
- Change the line `<div className="text-white font-bold text-base mb-1">Juz {learningPages[0].page_number}</div>` to:

```tsx
<div className="text-white font-bold text-base mb-1">
  {learningPages[0].pages.surah_name} — Juz {learningPages[0].pages.juz}
</div>
```

- Change `const juzComplete = Math.floor(memorisedCount / 20)` (the Madinah mushaf does have ~20 pages/juz on average, but the *correct* count uses the actual juz mapping). Replace with:

```tsx
const memorisedJuzCount = new Set(
  pages
    .filter(p => p.status === 'memorised' || p.status === 'recent')
    .map(p => p.pages.juz)
).size
```

Then use `{memorisedJuzCount} Juz` in place of `{juzComplete} Juz` (this counts juz with *any* memorised page; if you want fully-completed juz only, see step 3).

- [ ] **Step 3: (Optional) Stricter "fully memorised juz" count**

If you want only juz where every page is memorised, add this helper and use it instead:

```tsx
function fullyMemorisedJuzCount(pages: UserPageWithMeta[], allPages: QuranPage[]): number {
  const memorisedSetByJuz = new Map<number, Set<number>>()
  for (const p of pages) {
    if (p.status !== 'memorised' && p.status !== 'recent') continue
    const set = memorisedSetByJuz.get(p.pages.juz) ?? new Set()
    set.add(p.page_number)
    memorisedSetByJuz.set(p.pages.juz, set)
  }
  const totalByJuz = new Map<number, number>()
  for (const ref of allPages) {
    totalByJuz.set(ref.juz, (totalByJuz.get(ref.juz) ?? 0) + 1)
  }
  let full = 0
  for (const [juz, mem] of memorisedSetByJuz) {
    if (mem.size === totalByJuz.get(juz)) full++
  }
  return full
}
```

Use `usePages()` (from R6 step 1) to source `allPages`.

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Add user_pages rows across two juz; confirm the juz map colours and Dashboard "X Juz" count reflect reality.

- [ ] **Step 5: Commit**

```bash
git add src/components/JuzStrengthMap.tsx src/screens/Dashboard.tsx
git commit -m "fix: JuzStrengthMap uses joined juz; Dashboard juz count accurate"
```

---

## Task R11: RevisionSession — StrictMode-safe + reveal-gate

The original calls `startSession` from a `useEffect` with no guard, creating duplicate session rows in dev. The hidden-text reveal is a single tap, which makes it trivial to cheat. Fix both.

**Files:**
- Modify: `src/screens/RevisionSession.tsx`
- Modify: `src/components/AyahCard.tsx`

- [ ] **Step 1: AyahCard — require long-press to reveal when defaultHidden**

In `src/components/AyahCard.tsx`, replace the overlay `<div onClick={...}>` with a long-press affordance:

```tsx
import { useRef, useState } from 'react'
// inside AyahCard:
const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
const [revealProgress, setRevealProgress] = useState(0)
const REVEAL_HOLD_MS = 600

const beginPress = () => {
  setRevealProgress(0)
  const startedAt = Date.now()
  pressTimer.current = setInterval(() => {
    const pct = Math.min(100, ((Date.now() - startedAt) / REVEAL_HOLD_MS) * 100)
    setRevealProgress(pct)
    if (pct >= 100) {
      cancelPress()
      setHidden(false)
    }
  }, 16)
}
const cancelPress = () => {
  if (pressTimer.current) { clearInterval(pressTimer.current); pressTimer.current = null }
  setRevealProgress(0)
}
```

Replace the overlay JSX:

```tsx
{hidden && (
  <div
    onPointerDown={beginPress}
    onPointerUp={cancelPress}
    onPointerLeave={cancelPress}
    onPointerCancel={cancelPress}
    role="button"
    aria-label="Hold to reveal ayah text"
    tabIndex={0}
    className="absolute inset-0 rounded-2xl bg-[#0f1117]/95 flex flex-col items-center justify-center gap-2 cursor-pointer z-10 select-none"
  >
    <span className="text-slate-500 font-semibold">Text hidden</span>
    <span className="text-slate-600 text-sm">Press and hold to reveal</span>
    <div className="w-32 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 transition-[width] duration-75" style={{ width: `${revealProgress}%` }} />
    </div>
  </div>
)}
```

- [ ] **Step 2: RevisionSession — guard session start**

Replace the relevant lines in `src/screens/RevisionSession.tsx`:

```ts
// imports
import { useRef, useState, useEffect } from 'react'
import { useUserPagesQuery, useApplyRating } from '../hooks/useUserPages'
// inside RevisionSession():
const { data: pages = [] } = useUserPagesQuery()  // not needed directly, useTodaysTasks pulls it
const applyRating = useApplyRating()
const startedRef = useRef(false)

useEffect(() => {
  if (startedRef.current) return
  startedRef.current = true
  startSession('revision')
}, [startSession])
```

And replace `applyRating(currentPage.page_number, rating)` calls with:

```ts
await applyRating.mutateAsync({ page: currentPage, rating })
```

(Note that `currentPage` here is a `UserPageWithMeta` from `useTodaysTasks` — `useApplyRating` accepts it directly.)

- [ ] **Step 3: Verify**

```bash
npm run dev
```

- In Supabase, count `sessions` rows for your user before navigating to `/revise`.
- Navigate to `/revise`. Count again — only **one** new row should exist.
- Confirm the AyahCard overlay requires a hold to reveal (600ms).

- [ ] **Step 4: Commit**

```bash
git add src/screens/RevisionSession.tsx src/components/AyahCard.tsx
git commit -m "fix: RevisionSession strict-mode guard + AyahCard hold-to-reveal"
```

---

## Task R12: Wire offline queue into all mutations

The original Task 15 defines a queue but no mutation uses it. Make `useUserPages` mutations enqueue when offline, and flush on reconnect.

**Files:**
- Replace: `src/lib/offline-queue.ts`
- Verify: `src/hooks/useUserPages.ts` (R6) already calls `enqueueMutation` — confirm consistency

- [ ] **Step 1: Replace the queue with one that handles `_filter` for updates**

Replace `src/lib/offline-queue.ts`:

```ts
import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'

export interface QueuedMutation {
  id?: number
  table: string
  operation: 'insert' | 'update' | 'upsert'
  // For updates: include a `_filter` object describing the `eq(...)` chain
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

export async function enqueueMutation(op: Omit<QueuedMutation, 'id' | 'timestamp'>) {
  const db = await getDB()
  await db.add('queue', { ...op, timestamp: Date.now() })
}

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  const db = await getDB()
  const ops = (await db.getAll('queue')) as QueuedMutation[]
  let ok = 0, failed = 0
  for (const op of ops) {
    let error = null
    if (op.operation === 'insert') {
      ;({ error } = await supabase.from(op.table).insert(stripFilter(op.payload)))
    } else if (op.operation === 'upsert') {
      ;({ error } = await supabase.from(op.table).upsert(stripFilter(op.payload)))
    } else if (op.operation === 'update') {
      const filter = op.payload._filter ?? {}
      let q = supabase.from(op.table).update(stripFilter(op.payload))
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as string | number)
      ;({ error } = await q)
    }
    if (error) { failed++; continue }
    if (op.id != null) await db.delete('queue', op.id)
    ok++
  }
  return { ok, failed }
}

function stripFilter(payload: QueuedMutation['payload']) {
  const { _filter, ...rest } = payload
  return rest
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueue().catch(console.error) })
}
```

- [ ] **Step 2: Flush on auth + on app load**

In `src/App.tsx`, add inside `AuthedRoutes` (after the `if (!user) return …`):

```ts
import { useEffect } from 'react'
import { flushQueue } from './lib/offline-queue'
// inside AuthedRoutes after auth gate:
useEffect(() => {
  if (navigator.onLine) flushQueue().catch(console.error)
}, [])
```

- [ ] **Step 3: Smoke test**

```bash
npm run dev
```

- Open DevTools → Network → set to Offline.
- Add a page, rate one, change a setting. Each mutation should resolve locally (cache updated optimistically by R6) without throwing.
- Set Network back to Online. The "online" listener flushes the queue. Refresh and confirm the page state in Supabase matches.

- [ ] **Step 4: Commit**

```bash
git add src/lib/offline-queue.ts src/App.tsx
git commit -m "feat: offline queue wired into all mutations"
```

---

## Task R13: Service worker update prompt + a11y polish

**Files:**
- Create: `src/components/UpdatePrompt.tsx`
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Modify: `src/screens/MyQuran.tsx` (memoize grid)

- [ ] **Step 1: Switch PWA to prompt mode**

In `vite.config.ts`, change `registerType: 'autoUpdate'` to `registerType: 'prompt'`.

- [ ] **Step 2: UpdatePrompt component**

Create `src/components/UpdatePrompt.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function UpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() { setNeedsRefresh(true) },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needsRefresh) return null
  return (
    <div role="alert" className="fixed bottom-20 left-4 right-4 z-50 bg-blue-900 text-white rounded-xl p-3 flex items-center gap-3 shadow-lg max-w-lg mx-auto">
      <span className="flex-1 text-sm">A new version is available.</span>
      <button onClick={() => updateSW?.()} className="bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-bold">Reload</button>
      <button onClick={() => setNeedsRefresh(false)} className="text-blue-200 px-2 text-sm">Later</button>
    </div>
  )
}
```

- [ ] **Step 3: Mount it**

In `src/main.tsx`:

```tsx
import { UpdatePrompt } from './components/UpdatePrompt'
// inside the render:
<React.StrictMode>
  <App />
  <UpdatePrompt />
</React.StrictMode>
```

- [ ] **Step 4: Memoize MyQuran grid cells**

In `src/screens/MyQuran.tsx`, extract the cell:

```tsx
import { memo } from 'react'

const PageCell = memo(function PageCell({ n, color, selected, onClick }: {
  n: number; color: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Page ${n}${selected ? ', selected' : ''}`}
      className={`aspect-square rounded-sm text-[6px] font-bold flex items-center justify-center ${color} ${selected ? 'ring-1 ring-white' : ''}`}
    >
      {n % 20 === 0 ? n : ''}
    </button>
  )
})
```

Use it in the grid `.map`:

```tsx
{Array.from({ length: 604 }, (_, i) => i + 1).map(n => (
  <PageCell
    key={n}
    n={n}
    color={getPageColor(pageMap.get(n))}
    selected={selected === n}
    onClick={() => setSelected(selected === n ? null : n)}
  />
))}
```

- [ ] **Step 5: Verify**

```bash
npm run build && npm run preview
```

Open in Chrome → DevTools → Application → Service Workers. Confirm SW registers. Make a code change, rebuild, refresh — the update banner appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/UpdatePrompt.tsx src/main.tsx vite.config.ts src/screens/MyQuran.tsx
git commit -m "feat: SW update prompt + memoized MyQuran grid + aria-labels"
```

---

## Task R14: Extended test suite

**Files:**
- Create: `src/lib/offline-queue.test.ts`
- Create: `src/lib/today-tasks.test.ts` (extend existing)

- [ ] **Step 1: Offline queue test**

Create `src/lib/offline-queue.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), then: undefined })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

import { enqueueMutation, flushQueue } from './offline-queue'

beforeEach(async () => {
  // Wipe IDB between tests
  indexedDB = new (await import('fake-indexeddb')).IDBFactory()
})

describe('offline-queue', () => {
  it('enqueues and flushes an insert', async () => {
    await enqueueMutation({ table: 'sessions', operation: 'insert', payload: { user_id: 'u', type: 'revision' } })
    const result = await flushQueue()
    expect(result.ok).toBe(1)
    expect(result.failed).toBe(0)
  })
})
```

Install:

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 2: today-tasks regression**

Append to `src/lib/today-tasks.test.ts`:

```ts
it('does not include memorised pages whose next_review_date is in future', () => {
  const pages = [makePage({ page_number: 1, status: 'memorised', next_review_date: '2030-01-01' })]
  const result = computeTodaysTasks(pages, today)
  expect(result.spacedPages).toHaveLength(0)
  expect(result.totalDue).toBe(0)
})
```

- [ ] **Step 3: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass (sm2 11, today-tasks 5, ayah-utils 2, auto-graduate 5, portion 7, AyahCard 3, RepCounter 2, offline-queue 1 = 36 tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/offline-queue.test.ts src/lib/today-tasks.test.ts package.json package-lock.json
git commit -m "test: offline queue + today-tasks future-date regression"
```

---

## Final verification checklist

- [ ] All Vitest tests pass: `npx vitest run`
- [ ] `npm run build` produces no TypeScript errors
- [ ] In dev: signing up creates a `user_settings` row, dashboard loads with empty state
- [ ] Adding page 1 with `daily_target = quarter`: portion shows 1–2 ayahs; finishing one portion advances `progress_ayah_key`; finishing the last portion graduates to `recent`
- [ ] Set `recent_cycle_days = 0` in Supabase manually for a recent page with `graduated_to_recent_at = '2026-01-01'`: reload dashboard, page auto-graduates to `memorised`
- [ ] Going offline: rating a revision page does not throw; coming back online flushes; Supabase reflects the change
- [ ] JuzStrengthMap shows colours that match the user's pages (not all empty)
- [ ] Hidden-text overlay requires hold; tap alone does not reveal
- [ ] In Supabase, only **one** `sessions` row per revision session (StrictMode-safe)
- [ ] Tanzil seed populates `ayah_ordinal` for all rows

---

## Out of scope (per user)
- Mushaf edition switching (Madinah-only)
- Mutashabihat tracking
- Audio playback
- Teacher / halaqa mode
- Prayer-time-aware reminders

## Future work, deliberately deferred
- Streak / hifz-day tracking
- Hizb / wird based revision schedules (the `hizb` column is seeded; UI to come)
- Previous-ayah peek control
- Per-ayah mistake tracking
- Server-side cron for auto-graduation (currently client-side, requires app open)
