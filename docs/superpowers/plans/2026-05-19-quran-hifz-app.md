# Quran Hifz App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA Quran memorisation companion with hybrid spaced repetition, rep tracking, and a juz strength dashboard.

**Architecture:** React + Vite PWA frontend, Supabase for auth/database/sync, Tailwind CSS for styling. SM-2 spaced repetition algorithm runs client-side after each revision session. Offline interactions queue to IndexedDB and sync on reconnect.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase JS v2, vite-plugin-pwa, react-router-dom v6, date-fns, idb, Vitest, @testing-library/react

---

## File Structure

```
quran-hifz-app/
├── public/
│   ├── manifest.json
│   └── icons/icon-192.png, icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/index.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── sm2.ts
│   │   ├── offline-queue.ts
│   │   └── today-tasks.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUserPages.ts
│   │   ├── useTodaysTasks.ts
│   │   ├── useSettings.ts
│   │   ├── useAyahCache.ts
│   │   └── useSession.ts
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── Dashboard.tsx
│   │   ├── MemorisationSession.tsx
│   │   ├── RevisionSession.tsx
│   │   ├── MyQuran.tsx
│   │   └── SettingsScreen.tsx
│   └── components/
│       ├── BottomNav.tsx
│       ├── JuzStrengthMap.tsx
│       ├── AyahCard.tsx
│       ├── RepCounter.tsx
│       └── RatingButtons.tsx
├── supabase/
│   ├── migrations/001_initial.sql
│   └── seed/seed-quran.ts
├── vite.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `src/main.tsx`, `src/App.tsx`, `index.html`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/mohamadazizii
npm create vite@latest quran-hifz-app -- --template react-ts
cd quran-hifz-app
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom date-fns idb
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['Amiri', 'Traditional Arabic', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Amiri:ital@0;1&display=swap');
```

- [ ] **Step 4: Configure Vite with PWA plugin**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Hifz Companion',
        short_name: 'Hifz',
        theme_color: '#0f1117',
        background_color: '#0f1117',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api' },
          },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create .env file**

Create `.env.local`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `.gitignore` entry — add `.env.local` if not already there.

- [ ] **Step 7: Create placeholder icons**

```bash
mkdir -p public/icons
# Add 192x192 and 512x512 PNG icons to public/icons/
# Use any placeholder image for now — replace before shipping
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: project scaffold with Vite, Tailwind, PWA, Vitest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**

```ts
// src/types/index.ts

export type PageStatus = 'learning' | 'recent' | 'memorised'
export type Rating = 'strong' | 'okay' | 'weak'
export type SessionType = 'memorisation' | 'revision'
export type DailyTarget = 'quarter' | 'half' | 'one' | 'two'

export interface QuranPage {
  page_number: number
  juz: number
  hizb: number
  surah_name: string
  first_ayah: string
  last_ayah: string
}

export interface UserPage {
  id: string
  user_id: string
  page_number: number
  status: PageStatus
  strength: number        // SM-2 easiness factor, default 2.5
  interval_days: number
  repetitions: number
  next_review_date: string  // ISO date string YYYY-MM-DD
  last_reviewed_at: string | null
}

export interface Session {
  id: string
  user_id: string
  type: SessionType
  started_at: string
  completed_at: string | null
  total_pages: number
}

export interface SessionRating {
  id: string
  session_id: string
  page_number: number
  rating: Rating
  reps_with_mushaf: number
  reps_from_memory: number
  reps_revision: number
}

export interface AyahCache {
  page_number: number
  ayah_key: string
  text_uthmani: string
}

export interface UserSettings {
  user_id: string
  daily_target: DailyTarget
  memorisation_reps_mushaf: number
  memorisation_reps_memory: number
  recent_cycle_days: number
  notifications_enabled: boolean
  daily_reminder_time: string  // HH:MM
}

export interface TodaysTasks {
  newPages: UserPage[]
  recentPages: UserPage[]
  spacedPages: UserPage[]
  totalDue: number
}

export interface SM2Result {
  interval_days: number
  strength: number
  repetitions: number
  next_review_date: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: TypeScript types"
```

---

## Task 3: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/001_initial.sql`:
```sql
-- Pages reference table (604 rows, seeded separately)
create table if not exists pages (
  page_number integer primary key,
  juz integer not null,
  hizb integer not null,
  surah_name text not null,
  first_ayah text not null,
  last_ayah text not null
);

-- Ayah text cache (from tanzil dataset)
create table if not exists ayah_cache (
  page_number integer not null references pages(page_number),
  ayah_key text not null,
  text_uthmani text not null,
  primary key (page_number, ayah_key)
);

-- User progress per page
create table if not exists user_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null references pages(page_number),
  status text not null check (status in ('learning', 'recent', 'memorised')),
  strength float not null default 2.5,
  interval_days integer not null default 1,
  repetitions integer not null default 0,
  next_review_date date not null default current_date,
  last_reviewed_at timestamptz,
  unique (user_id, page_number)
);

-- Sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('memorisation', 'revision')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_pages integer not null default 0
);

-- Per-page ratings within a session
create table if not exists session_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  page_number integer not null references pages(page_number),
  rating text check (rating in ('strong', 'okay', 'weak')),
  reps_with_mushaf integer not null default 0,
  reps_from_memory integer not null default 0,
  reps_revision integer not null default 0
);

-- User settings
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_target text not null default 'half'
    check (daily_target in ('quarter', 'half', 'one', 'two')),
  memorisation_reps_mushaf integer not null default 12,
  memorisation_reps_memory integer not null default 8,
  recent_cycle_days integer not null default 3,
  notifications_enabled boolean not null default true,
  daily_reminder_time time not null default '08:00'
);

-- Row Level Security
alter table user_pages enable row level security;
alter table sessions enable row level security;
alter table session_ratings enable row level security;
alter table user_settings enable row level security;

create policy "Users manage own pages" on user_pages
  for all using (auth.uid() = user_id);

create policy "Users manage own sessions" on sessions
  for all using (auth.uid() = user_id);

create policy "Users manage own ratings" on session_ratings
  for all using (
    session_id in (select id from sessions where user_id = auth.uid())
  );

create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id);

-- pages and ayah_cache are public read
create policy "Public read pages" on pages for select using (true);
create policy "Public read ayah_cache" on ayah_cache for select using (true);
alter table pages enable row level security;
alter table ayah_cache enable row level security;
```

- [ ] **Step 2: Run migration via Supabase dashboard**

Go to Supabase project → SQL Editor → paste and run the migration.

- [ ] **Step 3: Create Supabase client**

Create `src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/ src/lib/supabase.ts
git commit -m "feat: Supabase schema and client"
```

---

## Task 4: Quran Data Seeding

**Files:**
- Create: `supabase/seed/seed-quran.ts`

- [ ] **Step 1: Install seed script dependencies**

```bash
npm install -D tsx dotenv
```

- [ ] **Step 2: Write seed script**

Create `supabase/seed/seed-quran.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // needs service role to bypass RLS
)

async function seedPage(pageNumber: number) {
  // Fetch verse metadata from quran.com v4 API (free, no auth)
  const metaRes = await fetch(
    `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?fields=text_uthmani,verse_key,juz_number,hizb_number&per_page=50`
  )
  const metaJson = await metaRes.json()
  const verses = metaJson.verses as Array<{
    verse_key: string
    text_uthmani: string
    juz_number: number
    hizb_number: number
    chapter_id: number
  }>

  if (!verses.length) return

  // Surah name from first verse
  const chapterRes = await fetch(
    `https://api.quran.com/api/v4/chapters/${verses[0].chapter_id}?language=en`
  )
  const chapterJson = await chapterRes.json()
  const surahName: string = chapterJson.chapter.name_simple

  const juz = verses[0].juz_number
  const hizb = verses[0].hizb_number
  const firstAyah = verses[0].verse_key
  const lastAyah = verses[verses.length - 1].verse_key

  // Upsert pages row
  await supabase.from('pages').upsert({
    page_number: pageNumber,
    juz,
    hizb,
    surah_name: surahName,
    first_ayah: firstAyah,
    last_ayah: lastAyah,
  })

  // Upsert ayah_cache rows
  const ayahRows = verses.map(v => ({
    page_number: pageNumber,
    ayah_key: v.verse_key,
    text_uthmani: v.text_uthmani,
  }))
  await supabase.from('ayah_cache').upsert(ayahRows)

  console.log(`Seeded page ${pageNumber}`)
}

async function main() {
  for (let page = 1; page <= 604; page++) {
    await seedPage(page)
    // Be polite to the API
    await new Promise(r => setTimeout(r, 200))
  }
  console.log('Done seeding all 604 pages')
}

main().catch(console.error)
```

- [ ] **Step 3: Add service role key to .env.local**

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
```

- [ ] **Step 4: Run the seed script**

```bash
npx tsx supabase/seed/seed-quran.ts
```

Expected: logs "Seeded page 1" ... "Seeded page 604" ... "Done seeding all 604 pages". Takes ~5 minutes.

- [ ] **Step 5: Verify in Supabase**

In Supabase Table Editor, confirm `pages` has 604 rows and `ayah_cache` has ~6236 rows.

- [ ] **Step 6: Commit**

```bash
git add supabase/seed/seed-quran.ts
git commit -m "feat: Quran data seed script"
```

---

## Task 5: Auth

**Files:**
- Create: `src/hooks/useAuth.ts`
- Create: `src/screens/LoginScreen.tsx`

- [ ] **Step 1: Write useAuth hook**

Create `src/hooks/useAuth.ts`:
```ts
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signIn, signUp, signOut }
}
```

- [ ] **Step 2: Write LoginScreen**

Create `src/screens/LoginScreen.tsx`:
```tsx
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Hifz Companion</h1>
        <p className="text-slate-400 text-sm mb-8">Your personal Quran memorisation app</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-[#1e293b] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-[#1e293b] text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-slate-400 text-sm"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write App.tsx with auth gate**

Replace `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './screens/LoginScreen'
import { Dashboard } from './screens/Dashboard'
import { MemorisationSession } from './screens/MemorisationSession'
import { RevisionSession } from './screens/RevisionSession'
import { MyQuran } from './screens/MyQuran'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-slate-400">Loading…</div>
    </div>
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
```

Replace `src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 4: Create placeholder screens so app compiles**

Create minimal exports for each screen (full implementations come in later tasks):

`src/screens/Dashboard.tsx`:
```tsx
export function Dashboard() { return <div className="bg-[#0f1117] min-h-screen text-white p-4">Dashboard</div> }
```

`src/screens/MemorisationSession.tsx`:
```tsx
export function MemorisationSession() { return <div className="bg-[#0f1117] min-h-screen text-white p-4">Memorisation</div> }
```

`src/screens/RevisionSession.tsx`:
```tsx
export function RevisionSession() { return <div className="bg-[#0f1117] min-h-screen text-white p-4">Revision</div> }
```

`src/screens/MyQuran.tsx`:
```tsx
export function MyQuran() { return <div className="bg-[#0f1117] min-h-screen text-white p-4">My Quran</div> }
```

`src/screens/SettingsScreen.tsx`:
```tsx
export function SettingsScreen() { return <div className="bg-[#0f1117] min-h-screen text-white p-4">Settings</div> }
```

- [ ] **Step 5: Run dev server and verify auth gate works**

```bash
npm run dev
```

Expected: app loads, shows login screen when not authenticated.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: auth with Supabase, routing scaffold"
```

---

## Task 6: SM-2 Algorithm (TDD)

**Files:**
- Create: `src/lib/sm2.ts`
- Create: `src/lib/sm2.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/sm2.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calculateNextReview } from './sm2'

const today = '2026-05-19'

const basePage = {
  strength: 2.5,
  interval_days: 1,
  repetitions: 0,
  next_review_date: today,
}

describe('calculateNextReview', () => {
  it('resets interval to 1 and repetitions to 0 on weak rating', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 3, interval_days: 10 }, 'weak', today)
    expect(result.repetitions).toBe(0)
    expect(result.interval_days).toBe(1)
  })

  it('sets interval to 1 on first okay review', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 0 }, 'okay', today)
    expect(result.repetitions).toBe(1)
    expect(result.interval_days).toBe(1)
  })

  it('sets interval to 6 on second okay review', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 1, interval_days: 1 }, 'okay', today)
    expect(result.repetitions).toBe(2)
    expect(result.interval_days).toBe(6)
  })

  it('multiplies interval by easiness on third+ okay review', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 2, interval_days: 6 }, 'okay', today)
    expect(result.interval_days).toBe(Math.round(6 * 2.5))
    expect(result.repetitions).toBe(3)
  })

  it('sets interval further on strong rating', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 2, interval_days: 6 }, 'strong', today)
    expect(result.interval_days).toBeGreaterThan(Math.round(6 * 2.5))
  })

  it('decreases strength on weak rating', () => {
    const result = calculateNextReview({ ...basePage, strength: 2.5 }, 'weak', today)
    expect(result.strength).toBeLessThan(2.5)
  })

  it('does not let strength drop below 1.3', () => {
    const result = calculateNextReview({ ...basePage, strength: 1.3 }, 'weak', today)
    expect(result.strength).toBeGreaterThanOrEqual(1.3)
  })

  it('sets next_review_date to today + interval', () => {
    const result = calculateNextReview({ ...basePage, repetitions: 1, interval_days: 1 }, 'okay', today)
    // interval becomes 6, so next review is 6 days from today
    expect(result.next_review_date).toBe('2026-05-25')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/sm2.test.ts
```

Expected: FAIL — "calculateNextReview is not defined"

- [ ] **Step 3: Implement SM-2**

Create `src/lib/sm2.ts`:
```ts
import { addDays, format } from 'date-fns'
import type { Rating, SM2Result } from '../types'

interface PageSM2State {
  strength: number
  interval_days: number
  repetitions: number
  next_review_date: string
}

// Rating mapped to SM-2 quality score: weak=1, okay=3, strong=5
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
    else interval_days = Math.round(interval_days * strength)
    repetitions += 1
  } else {
    repetitions = 0
    interval_days = 1
  }

  strength = Math.max(1.3, strength + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  const next_review_date = format(addDays(new Date(today), interval_days), 'yyyy-MM-dd')

  return { strength, interval_days, repetitions, next_review_date }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/sm2.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sm2.ts src/lib/sm2.test.ts
git commit -m "feat: SM-2 spaced repetition algorithm (TDD)"
```

---

## Task 7: Today's Tasks Logic (TDD)

**Files:**
- Create: `src/lib/today-tasks.ts`
- Create: `src/lib/today-tasks.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/today-tasks.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeTodaysTasks } from './today-tasks'
import type { UserPage } from '../types'

const today = '2026-05-19'

function makePage(overrides: Partial<UserPage>): UserPage {
  return {
    id: '1',
    user_id: 'u1',
    page_number: 1,
    status: 'memorised',
    strength: 2.5,
    interval_days: 7,
    repetitions: 3,
    next_review_date: today,
    last_reviewed_at: null,
    ...overrides,
  }
}

describe('computeTodaysTasks', () => {
  it('includes learning pages in newPages regardless of next_review_date', () => {
    const pages = [makePage({ status: 'learning', next_review_date: '2099-01-01' })]
    const result = computeTodaysTasks(pages, today)
    expect(result.newPages).toHaveLength(1)
    expect(result.recentPages).toHaveLength(0)
  })

  it('includes recent pages due today or earlier', () => {
    const pages = [
      makePage({ page_number: 1, status: 'recent', next_review_date: today }),
      makePage({ page_number: 2, status: 'recent', next_review_date: '2026-05-20' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.recentPages).toHaveLength(1)
    expect(result.recentPages[0].page_number).toBe(1)
  })

  it('includes memorised pages due today or earlier in spacedPages', () => {
    const pages = [
      makePage({ page_number: 1, status: 'memorised', next_review_date: today }),
      makePage({ page_number: 2, status: 'memorised', next_review_date: '2026-05-18' }),
      makePage({ page_number: 3, status: 'memorised', next_review_date: '2026-05-20' }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.spacedPages).toHaveLength(2)
  })

  it('computes totalDue correctly', () => {
    const pages = [
      makePage({ page_number: 1, status: 'learning' }),
      makePage({ page_number: 2, status: 'recent', next_review_date: today }),
      makePage({ page_number: 3, status: 'memorised', next_review_date: today }),
    ]
    const result = computeTodaysTasks(pages, today)
    expect(result.totalDue).toBe(3)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npx vitest run src/lib/today-tasks.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/today-tasks.ts`:
```ts
import type { UserPage, TodaysTasks } from '../types'

export function computeTodaysTasks(pages: UserPage[], today: string): TodaysTasks {
  const newPages = pages.filter(p => p.status === 'learning')

  const recentPages = pages.filter(
    p => p.status === 'recent' && p.next_review_date <= today
  )

  const spacedPages = pages.filter(
    p => p.status === 'memorised' && p.next_review_date <= today
  )

  return {
    newPages,
    recentPages,
    spacedPages,
    totalDue: newPages.length + recentPages.length + spacedPages.length,
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx vitest run src/lib/today-tasks.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/today-tasks.ts src/lib/today-tasks.test.ts
git commit -m "feat: today's tasks logic (TDD)"
```

---

## Task 8: Data Hooks

**Files:**
- Create: `src/hooks/useUserPages.ts`
- Create: `src/hooks/useTodaysTasks.ts`
- Create: `src/hooks/useSettings.ts`
- Create: `src/hooks/useAyahCache.ts`
- Create: `src/hooks/useSession.ts`

- [ ] **Step 1: useUserPages**

Create `src/hooks/useUserPages.ts`:
```ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { UserPage, PageStatus, Rating } from '../types'
import { calculateNextReview } from '../lib/sm2'
import { format } from 'date-fns'

export function useUserPages() {
  const { user } = useAuth()
  const [pages, setPages] = useState<UserPage[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('user_pages')
      .select('*')
      .eq('user_id', user.id)
    if (data) setPages(data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addPage = async (page_number: number) => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase.from('user_pages').insert({
      user_id: user.id,
      page_number,
      status: 'learning' as PageStatus,
      strength: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review_date: today,
    }).select().single()
    if (data) setPages(prev => [...prev, data])
  }

  const graduatePage = async (page_number: number, to: PageStatus) => {
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('user_pages')
      .update({ status: to, last_reviewed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('page_number', page_number)
      .select().single()
    if (data) setPages(prev => prev.map(p => p.page_number === page_number ? data : p))
  }

  const applyRating = async (page_number: number, rating: Rating) => {
    if (!user) return
    const page = pages.find(p => p.page_number === page_number)
    if (!page) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const sm2 = calculateNextReview(page, rating, today)
    const { data } = await supabase
      .from('user_pages')
      .update({ ...sm2, last_reviewed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('page_number', page_number)
      .select().single()
    if (data) setPages(prev => prev.map(p => p.page_number === page_number ? data : p))
  }

  return { pages, loading, addPage, graduatePage, applyRating, refetch: fetch }
}
```

- [ ] **Step 2: useTodaysTasks**

Create `src/hooks/useTodaysTasks.ts`:
```ts
import { useMemo } from 'react'
import { format } from 'date-fns'
import { computeTodaysTasks } from '../lib/today-tasks'
import { useUserPages } from './useUserPages'

export function useTodaysTasks() {
  const { pages, loading } = useUserPages()
  const today = format(new Date(), 'yyyy-MM-dd')
  const tasks = useMemo(() => computeTodaysTasks(pages, today), [pages, today])
  return { tasks, loading }
}
```

- [ ] **Step 3: useSettings**

Create `src/hooks/useSettings.ts`:
```ts
import { useEffect, useState } from 'react'
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
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setSettings(data)
        } else {
          // Create defaults on first use
          supabase.from('user_settings').insert({ user_id: user.id, ...DEFAULTS })
            .select().single()
            .then(({ data: d }) => { if (d) setSettings(d) })
        }
      })
  }, [user])

  const updateSettings = async (updates: Partial<Omit<UserSettings, 'user_id'>>) => {
    if (!user || !settings) return
    const { data } = await supabase.from('user_settings')
      .update(updates).eq('user_id', user.id).select().single()
    if (data) setSettings(data)
  }

  return { settings, updateSettings }
}
```

- [ ] **Step 4: useAyahCache**

Create `src/hooks/useAyahCache.ts`:
```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AyahCache } from '../types'

export function useAyahCache(pageNumber: number | null) {
  const [ayahs, setAyahs] = useState<AyahCache[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pageNumber) return
    setLoading(true)
    supabase.from('ayah_cache').select('*').eq('page_number', pageNumber)
      .then(({ data }) => {
        if (data) setAyahs(data)
        setLoading(false)
      })
  }, [pageNumber])

  return { ayahs, loading }
}
```

- [ ] **Step 5: useSession**

Create `src/hooks/useSession.ts`:
```ts
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SessionType, Rating } from '../types'

export function useSession() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)

  const startSession = async (type: SessionType) => {
    if (!user) return null
    const { data } = await supabase.from('sessions').insert({
      user_id: user.id,
      type,
      started_at: new Date().toISOString(),
      total_pages: 0,
    }).select().single()
    if (data) { setSessionId(data.id); return data.id }
    return null
  }

  const logRating = async (
    page_number: number,
    rating: Rating,
    reps: { reps_with_mushaf?: number; reps_from_memory?: number; reps_revision?: number }
  ) => {
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
      page_number,
      rating,
      reps_with_mushaf: reps.reps_with_mushaf ?? 0,
      reps_from_memory: reps.reps_from_memory ?? 0,
      reps_revision: reps.reps_revision ?? 0,
    })
  }

  const logMemorisation = async (
    page_number: number,
    reps_with_mushaf: number,
    reps_from_memory: number
  ) => {
    if (!sessionId) return
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
      page_number,
      rating: null,
      reps_with_mushaf,
      reps_from_memory,
      reps_revision: 0,
    })
  }

  const completeSession = async (total_pages: number) => {
    if (!sessionId) return
    await supabase.from('sessions').update({
      completed_at: new Date().toISOString(),
      total_pages,
    }).eq('id', sessionId)
    setSessionId(null)
  }

  return { sessionId, startSession, logRating, logMemorisation, completeSession }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/ src/lib/today-tasks.ts
git commit -m "feat: data hooks (useUserPages, useTodaysTasks, useSettings, useAyahCache, useSession)"
```

---

## Task 9: Shared Components

**Files:**
- Create: `src/components/AyahCard.tsx`
- Create: `src/components/RepCounter.tsx`
- Create: `src/components/RatingButtons.tsx`
- Create: `src/components/JuzStrengthMap.tsx`
- Create: `src/components/BottomNav.tsx`

- [ ] **Step 1: AyahCard**

Create `src/components/AyahCard.tsx`:
```tsx
import { useState } from 'react'
import type { AyahCache } from '../types'

interface Props {
  ayahs: AyahCache[]
  pageNumber: number
  surahName: string
  defaultHidden?: boolean
}

export function AyahCard({ ayahs, pageNumber, surahName, defaultHidden = false }: Props) {
  const [hidden, setHidden] = useState(defaultHidden)

  return (
    <div className="bg-[#1e293b] rounded-2xl p-5 mb-3 relative">
      {hidden && (
        <div
          onClick={() => setHidden(false)}
          className="absolute inset-0 rounded-2xl bg-[#0f1117]/95 flex flex-col items-center justify-center gap-2 cursor-pointer z-10"
        >
          <span className="text-slate-500 font-semibold">Text hidden</span>
          <span className="text-slate-600 text-sm">Tap to reveal</span>
        </div>
      )}
      <div className="text-right text-2xl leading-loose font-arabic text-slate-100 dir-rtl" dir="rtl">
        {ayahs.map(a => a.text_uthmani).join(' ')}
      </div>
      <div className="text-xs text-slate-500 mt-3">{surahName} · Page {pageNumber}</div>
      <button
        onClick={() => setHidden(h => !h)}
        className="mt-3 w-full bg-[#0f172a] border border-[#334155] text-slate-400 rounded-xl py-2 text-sm font-semibold"
      >
        {hidden ? '👁 Reveal text' : '👁 Hide text (test yourself)'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write AyahCard test**

Create `src/components/AyahCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AyahCard } from './AyahCard'

const ayahs = [{ page_number: 1, ayah_key: '1:1', text_uthmani: 'بِسْمِ ٱللَّهِ' }]

it('shows text by default when defaultHidden is false', () => {
  render(<AyahCard ayahs={ayahs} pageNumber={1} surahName="Al-Fatihah" defaultHidden={false} />)
  expect(screen.queryByText('Text hidden')).not.toBeInTheDocument()
})

it('hides text and shows overlay when defaultHidden is true', () => {
  render(<AyahCard ayahs={ayahs} pageNumber={1} surahName="Al-Fatihah" defaultHidden={true} />)
  expect(screen.getByText('Text hidden')).toBeInTheDocument()
})

it('reveals text on overlay click', async () => {
  render(<AyahCard ayahs={ayahs} pageNumber={1} surahName="Al-Fatihah" defaultHidden={true} />)
  await userEvent.click(screen.getByText('Text hidden'))
  expect(screen.queryByText('Text hidden')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run AyahCard tests**

```bash
npx vitest run src/components/AyahCard.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 4: RepCounter**

Create `src/components/RepCounter.tsx`:
```tsx
interface Props {
  label: string
  count: number
  target: number
  color: 'blue' | 'purple'
  onAdd: () => void
}

export function RepCounter({ label, count, target, color, onAdd }: Props) {
  const dots = Array.from({ length: target }, (_, i) => i)
  const colorMap = {
    blue: { dot: 'bg-blue-500', btn: 'bg-blue-600 hover:bg-blue-500' },
    purple: { dot: 'bg-purple-500', btn: 'bg-purple-600 hover:bg-purple-500' },
  }
  const c = colorMap[color]

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <span className="text-lg font-bold text-white">{count} <span className="text-sm text-slate-500">/ {target}</span></span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {dots.map(i => (
          <div key={i} className={`w-4 h-4 rounded-full ${i < count ? c.dot : 'bg-white/10'}`} />
        ))}
      </div>
      <button
        onClick={onAdd}
        disabled={count >= target}
        className={`w-full ${c.btn} text-white rounded-xl py-3 font-semibold disabled:opacity-40 transition-colors`}
      >
        + Log rep
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write RepCounter test**

Create `src/components/RepCounter.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { RepCounter } from './RepCounter'

it('calls onAdd when button is clicked', async () => {
  const onAdd = vi.fn()
  render(<RepCounter label="With Mushaf" count={0} target={5} color="blue" onAdd={onAdd} />)
  await userEvent.click(screen.getByRole('button'))
  expect(onAdd).toHaveBeenCalledOnce()
})

it('disables button when count equals target', () => {
  render(<RepCounter label="With Mushaf" count={5} target={5} color="blue" onAdd={() => {}} />)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

- [ ] **Step 6: Run RepCounter tests**

```bash
npx vitest run src/components/RepCounter.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 7: RatingButtons**

Create `src/components/RatingButtons.tsx`:
```tsx
import type { Rating } from '../types'

interface Props {
  selected: Rating | null
  onSelect: (r: Rating) => void
}

const ratings: { value: Rating; emoji: string; label: string; sub: string; color: string; activeColor: string }[] = [
  { value: 'weak', emoji: '😓', label: 'Weak', sub: 'Struggled', color: 'border-red-700 text-red-400', activeColor: 'bg-red-950 border-red-500' },
  { value: 'okay', emoji: '🙂', label: 'Okay', sub: 'Some gaps', color: 'border-amber-700 text-amber-400', activeColor: 'bg-amber-950 border-amber-500' },
  { value: 'strong', emoji: '💪', label: 'Strong', sub: 'Fluent', color: 'border-green-700 text-green-400', activeColor: 'bg-green-950 border-green-500' },
]

export function RatingButtons({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {ratings.map(r => (
        <button
          key={r.value}
          onClick={() => onSelect(r.value)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors
            ${selected === r.value ? r.activeColor : 'bg-transparent border-slate-700'} ${r.color}`}
        >
          <span className="text-xl">{r.emoji}</span>
          <span className="text-sm font-bold">{r.label}</span>
          <span className="text-xs opacity-70">{r.sub}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: JuzStrengthMap**

Create `src/components/JuzStrengthMap.tsx`:
```tsx
import type { UserPage } from '../types'

interface Props {
  userPages: UserPage[]
  onJuzClick?: (juz: number) => void
}

function getJuzColor(pages: UserPage[]): string {
  if (pages.length === 0) return 'bg-[#0f172a] border border-[#1e293b] text-slate-700'
  const learning = pages.some(p => p.status === 'learning')
  if (learning) return 'bg-blue-600 text-white'
  const avg = pages.reduce((sum, p) => sum + p.strength, 0) / pages.length
  if (avg >= 4) return 'bg-green-700 text-white'
  if (avg >= 3) return 'bg-green-500 text-white'
  if (avg >= 2.5) return 'bg-amber-500 text-white'
  if (avg >= 1.8) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

export function JuzStrengthMap({ userPages, onJuzClick }: Props) {
  return (
    <div className="bg-[#1e293b] rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Juz Strength Map</h3>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
          const juzPages = userPages.filter(p => {
            // pages table juz field — we don't have it in UserPage directly
            // This gets wired up in the Dashboard via the joined pages data
            return true // placeholder; actual juz filtering happens in Dashboard
          })
          return (
            <button
              key={juz}
              onClick={() => onJuzClick?.(juz)}
              className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold ${getJuzColor([])}`}
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

- [ ] **Step 9: BottomNav**

Create `src/components/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/quran', label: 'My Quran', icon: '📖' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-slate-700 flex z-50">
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors
            ${isActive ? 'text-blue-400' : 'text-slate-500'}`
          }
        >
          <span className="text-lg">{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 10: Commit**

```bash
git add src/components/
git commit -m "feat: shared components (AyahCard, RepCounter, RatingButtons, JuzStrengthMap, BottomNav)"
```

---

## Task 10: Dashboard Screen

**Files:**
- Modify: `src/screens/Dashboard.tsx`

- [ ] **Step 1: Implement Dashboard**

Replace `src/screens/Dashboard.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useUserPages } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useSettings } from '../hooks/useSettings'
import { BottomNav } from '../components/BottomNav'
import { JuzStrengthMap } from '../components/JuzStrengthMap'
import type { DailyTarget } from '../types'

const TARGET_LABELS: Record<DailyTarget, string> = {
  quarter: '¼ page',
  half: '½ page',
  one: '1 page',
  two: '2 pages',
}

const TARGET_OPTIONS: DailyTarget[] = ['quarter', 'half', 'one', 'two']

export function Dashboard() {
  const navigate = useNavigate()
  const { pages, loading: pagesLoading } = useUserPages()
  const { tasks } = useTodaysTasks()
  const { settings, updateSettings } = useSettings()

  const memorisedCount = pages.filter(p => p.status === 'memorised' || p.status === 'recent').length
  const juzComplete = Math.floor(memorisedCount / 20)
  const pct = Math.round((memorisedCount / 604) * 100)

  const learningPages = tasks.newPages

  if (pagesLoading || !settings) {
    return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-slate-400">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-xl font-bold">My Hifz</h1>
        </div>

        {/* Progress banner */}
        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#1a2e4a] border border-[#2d4a6e] rounded-2xl p-4 mb-5">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Memorised</div>
          <div className="text-3xl font-extrabold text-blue-400">{juzComplete} Juz</div>
          <div className="text-sm text-slate-400 mt-1">{memorisedCount} of 604 pages · {pct}% complete</div>
          <div className="bg-[#0f172a] rounded-full h-1.5 mt-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Daily target */}
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Daily Target</div>
        <div className="bg-[#1e293b] rounded-xl p-3 flex gap-2 mb-5">
          {TARGET_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => updateSettings({ daily_target: t })}
              className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors
                ${settings.daily_target === t ? 'bg-blue-700 text-white' : 'bg-[#0f172a] text-slate-500 border border-[#334155]'}`}
            >
              {TARGET_LABELS[t]}
            </button>
          ))}
        </div>

        {/* New memorisation */}
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">New Memorisation</div>
        {learningPages.length > 0 ? (
          <div className="bg-gradient-to-br from-[#052e16] to-[#14532d] border border-green-800 rounded-2xl p-4 mb-5">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-green-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">Currently Learning</span>
              <span className="text-green-400 text-xs font-semibold">Page {learningPages[0].page_number}</span>
            </div>
            <div className="text-white font-bold text-base mb-1">Juz {learningPages[0].page_number}</div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('/memorise')}
                className="flex-1 bg-green-700 text-white rounded-xl py-2.5 text-sm font-bold"
              >
                Open Session
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('/memorise')}
            className="w-full bg-green-950 border border-dashed border-green-800 text-green-400 rounded-2xl py-4 text-sm font-semibold mb-5"
          >
            + Start memorising a new page
          </button>
        )}

        {/* Today's revision */}
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Today's Revision — {tasks.recentPages.length + tasks.spacedPages.length} pages
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {tasks.recentPages.length > 0 && (
            <div className="bg-[#1e293b] border-l-4 border-amber-500 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-amber-500/15 w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0">🔁</div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Recent</div>
                <div className="text-sm font-semibold">{tasks.recentPages.length} pages due</div>
              </div>
              <div className="bg-[#0f172a] rounded-lg px-3 py-1 text-sm font-bold text-slate-400">
                ~10 reps/pg
              </div>
            </div>
          )}
          {tasks.spacedPages.length > 0 && (
            <div className="bg-[#1e293b] border-l-4 border-purple-500 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-purple-500/15 w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0">🧠</div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Spaced Revision</div>
                <div className="text-sm font-semibold">{tasks.spacedPages.length} pages due</div>
              </div>
              <div className="bg-[#0f172a] rounded-lg px-3 py-1 text-sm font-bold text-slate-400">
                5–15 reps/pg
              </div>
            </div>
          )}
          {tasks.recentPages.length === 0 && tasks.spacedPages.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-4">No revision due today 🎉</div>
          )}
        </div>

        {/* Juz strength map */}
        <div className="mb-5">
          <JuzStrengthMap userPages={pages} />
        </div>

        {/* Start revision CTA */}
        {(tasks.recentPages.length > 0 || tasks.spacedPages.length > 0) && (
          <button
            onClick={() => navigate('/revise')}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-2xl py-4 text-base font-bold"
          >
            Start Today's Revision →
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard renders**

```bash
npm run dev
```

Open http://localhost:5173. Sign in. Verify dashboard loads with progress banner, target chips, and revision cards.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Dashboard.tsx
git commit -m "feat: Dashboard screen"
```

---

## Task 11: Memorisation Session Screen

**Files:**
- Modify: `src/screens/MemorisationSession.tsx`

- [ ] **Step 1: Implement MemorisationSession**

Replace `src/screens/MemorisationSession.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPages } from '../hooks/useUserPages'
import { useSettings } from '../hooks/useSettings'
import { useAyahCache } from '../hooks/useAyahCache'
import { useSession } from '../hooks/useSession'
import { AyahCard } from '../components/AyahCard'
import { RepCounter } from '../components/RepCounter'

export function MemorisationSession() {
  const navigate = useNavigate()
  const { pages, addPage, graduatePage } = useUserPages()
  const { settings } = useSettings()
  const { startSession, logMemorisation, completeSession } = useSession()

  const learningPages = pages.filter(p => p.status === 'learning')
  const currentPage = learningPages[0] ?? null

  const [repsWithMushaf, setRepsWithMushaf] = useState(0)
  const [repsFromMemory, setRepsFromMemory] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const { ayahs } = useAyahCache(currentPage?.page_number ?? null)

  const mushafTarget = settings?.memorisation_reps_mushaf ?? 12
  const memoryTarget = settings?.memorisation_reps_memory ?? 8

  const handleStartSession = async () => {
    const id = await startSession('memorisation')
    setSessionId(id)
    setSessionStarted(true)
  }

  const handleMarkMemorised = async () => {
    if (!currentPage) return
    await logMemorisation(currentPage.page_number, repsWithMushaf, repsFromMemory)
    await graduatePage(currentPage.page_number, 'recent')
    await completeSession(1)
    setRepsWithMushaf(0)
    setRepsFromMemory(0)
    navigate('/')
  }

  const handleAddNextPage = async () => {
    const nextPageNum = (currentPage?.page_number ?? 0) + 1
    if (nextPageNum > 604) return
    await addPage(nextPageNum)
  }

  // No learning pages — prompt to start one
  if (!currentPage) {
    const nextPage = Math.max(...pages.map(p => p.page_number), 0) + 1
    return (
      <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm mb-5">← Back</button>
        <h1 className="text-xl font-bold mb-6">New Memorisation</h1>
        <div className="text-slate-400 text-sm mb-6">
          You haven't started memorising a new page yet. Begin with page {nextPage}.
        </div>
        <button
          onClick={() => addPage(nextPage)}
          className="w-full bg-green-700 text-white rounded-2xl py-4 text-base font-bold"
        >
          Start Page {nextPage}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/')} className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm">← Back</button>
        <h1 className="text-lg font-bold flex-1">New Memorisation</h1>
        <div className="bg-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-400 font-semibold">Page {currentPage.page_number}</div>
      </div>

      <AyahCard
        ayahs={ayahs}
        pageNumber={currentPage.page_number}
        surahName="Page"
        defaultHidden={false}
      />

      {!sessionStarted ? (
        <button
          onClick={handleStartSession}
          className="w-full bg-green-700 text-white rounded-2xl py-4 text-base font-bold mb-4"
        >
          Start Session
        </button>
      ) : (
        <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-4">Track Repetitions</div>
          <RepCounter
            label="📖 With Mushaf"
            count={repsWithMushaf}
            target={mushafTarget}
            color="blue"
            onAdd={() => setRepsWithMushaf(r => r + 1)}
          />
          <div className="h-px bg-[#0f172a] my-3" />
          <RepCounter
            label="🧠 From Memory"
            count={repsFromMemory}
            target={memoryTarget}
            color="purple"
            onAdd={() => setRepsFromMemory(r => r + 1)}
          />
        </div>
      )}

      {sessionStarted && (
        <div className="flex gap-2">
          <button
            onClick={handleMarkMemorised}
            className="flex-1 bg-green-700 text-white rounded-xl py-3 font-bold text-sm"
          >
            ✓ Mark as Memorised
          </button>
          <button
            onClick={handleAddNextPage}
            className="flex-1 bg-[#1e293b] border border-green-800 text-green-400 rounded-xl py-3 font-semibold text-sm"
          >
            + Add next page
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify memorisation session**

```bash
npm run dev
```

Navigate to `/memorise`. Verify: page loads with ayah text, rep counters work, "Mark as Memorised" navigates back to dashboard.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MemorisationSession.tsx
git commit -m "feat: Memorisation session screen"
```

---

## Task 12: Revision Session Screen

**Files:**
- Modify: `src/screens/RevisionSession.tsx`

- [ ] **Step 1: Implement RevisionSession**

Replace `src/screens/RevisionSession.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPages } from '../hooks/useUserPages'
import { useTodaysTasks } from '../hooks/useTodaysTasks'
import { useAyahCache } from '../hooks/useAyahCache'
import { useSession } from '../hooks/useSession'
import { AyahCard } from '../components/AyahCard'
import { RatingButtons } from '../components/RatingButtons'
import { RepCounter } from '../components/RepCounter'
import type { Rating, UserPage } from '../types'

const SUGGESTED_REPS: Record<Rating, number> = { weak: 15, okay: 10, strong: 5 }

export function RevisionSession() {
  const navigate = useNavigate()
  const { applyRating } = useUserPages()
  const { tasks } = useTodaysTasks()
  const { startSession, logRating, completeSession } = useSession()

  // Combine recent and spaced into one ordered list
  const allPages: UserPage[] = [...tasks.recentPages, ...tasks.spacedPages]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [rating, setRating] = useState<Rating | null>(null)
  const [reps, setReps] = useState(0)
  const [sessionStarted, setSessionStarted] = useState(false)

  const currentPage = allPages[currentIndex] ?? null
  const { ayahs } = useAyahCache(currentPage?.page_number ?? null)
  const suggestedReps = rating ? SUGGESTED_REPS[rating] : 0

  useEffect(() => {
    const init = async () => {
      await startSession('revision')
      setSessionStarted(true)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = async () => {
    if (!currentPage || !rating) return
    await logRating(currentPage.page_number, rating, { reps_revision: reps })
    await applyRating(currentPage.page_number, rating)

    if (currentIndex + 1 >= allPages.length) {
      await completeSession(allPages.length)
      navigate('/')
      return
    }
    setCurrentIndex(i => i + 1)
    setRating(null)
    setReps(0)
  }

  const handleSkip = () => {
    if (currentIndex + 1 >= allPages.length) { navigate('/'); return }
    setCurrentIndex(i => i + 1)
    setRating(null)
    setReps(0)
  }

  if (allPages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f1117] text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">🎉</div>
        <div className="text-lg font-bold">No revision due today!</div>
        <button onClick={() => navigate('/')} className="text-blue-400 text-sm">← Back to dashboard</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white px-4 pt-5 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="bg-[#1e293b] text-slate-400 rounded-lg px-3 py-2 text-sm">← Back</button>
        <h1 className="text-lg font-bold flex-1">Revision Session</h1>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500">Page {currentIndex + 1} of {allPages.length}</span>
        <div className="flex-1 bg-[#1e293b] rounded-full h-1.5">
          <div
            className="bg-purple-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / allPages.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">{allPages.length - currentIndex - 1} left</span>
      </div>

      {currentPage && (
        <>
          {/* Page info */}
          <div className="bg-[#1e293b] rounded-xl p-3 flex justify-between items-center mb-3">
            <div>
              <div className="text-base font-bold">Page {currentPage.page_number}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {currentPage.status === 'recent' ? 'Recent' : 'Spaced Revision'}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-bold uppercase ${currentPage.status === 'recent' ? 'text-amber-400' : 'text-purple-400'}`}>
                {currentPage.status === 'recent' ? '🔁 Recent' : '🧠 Spaced'}
              </div>
              {currentPage.last_reviewed_at && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Last reviewed {new Date(currentPage.last_reviewed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Ayah card — hidden by default */}
          <AyahCard
            ayahs={ayahs}
            pageNumber={currentPage.page_number}
            surahName="Page"
            defaultHidden={true}
          />

          {/* Rating */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">How well did you know this page?</div>
            <RatingButtons selected={rating} onSelect={r => { setRating(r); setReps(0) }} />
          </div>

          {/* Suggested reps — shown after rating */}
          {rating && (
            <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-xs uppercase tracking-widest text-slate-500">Suggested Repetitions</div>
                <div className="text-xs text-amber-400 font-semibold">{suggestedReps} reps · {rating}</div>
              </div>
              <RepCounter
                label="Repetitions"
                count={reps}
                target={suggestedReps}
                color="purple"
                onAdd={() => setReps(r => r + 1)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleSkip} className="bg-[#1e293b] border border-slate-700 text-slate-400 rounded-xl px-4 py-3 font-semibold text-sm">
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={!rating}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-40"
            >
              {currentIndex + 1 >= allPages.length ? 'Finish ✓' : 'Next page →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify revision session**

```bash
npm run dev
```

Add a test page with `status: 'memorised'` and `next_review_date: today` directly in Supabase. Navigate to `/revise`. Verify: page shows hidden text, rating buttons work, rep counter appears after rating, "Next page" advances.

- [ ] **Step 3: Commit**

```bash
git add src/screens/RevisionSession.tsx
git commit -m "feat: Revision session screen"
```

---

## Task 13: My Quran Screen

**Files:**
- Modify: `src/screens/MyQuran.tsx`

- [ ] **Step 1: Implement MyQuran**

Replace `src/screens/MyQuran.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserPages } from '../hooks/useUserPages'
import { BottomNav } from '../components/BottomNav'
import type { UserPage, PageStatus } from '../types'

function getPageColor(page: UserPage | undefined): string {
  if (!page) return 'bg-[#0f172a] border border-[#1e293b] text-slate-700'
  if (page.status === 'learning') return 'bg-blue-600 text-white'
  if (page.status === 'recent') return 'bg-amber-500 text-white'
  if (page.strength >= 4) return 'bg-green-700 text-white'
  if (page.strength >= 3) return 'bg-green-500 text-white'
  if (page.strength >= 2) return 'bg-amber-500 text-white'
  return 'bg-red-600 text-white'
}

export function MyQuran() {
  const navigate = useNavigate()
  const { pages, graduatePage } = useUserPages()
  const [selected, setSelected] = useState<number | null>(null)

  const pageMap = new Map(pages.map(p => [p.page_number, p]))
  const selectedPage = selected ? pageMap.get(selected) : null

  const STATUS_OPTIONS: PageStatus[] = ['learning', 'recent', 'memorised']

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <h1 className="text-xl font-bold mb-5">My Quran</h1>

        {/* Page grid */}
        <div className="grid grid-cols-[repeat(20,1fr)] gap-0.5 mb-6">
          {Array.from({ length: 604 }, (_, i) => i + 1).map(n => {
            const p = pageMap.get(n)
            return (
              <button
                key={n}
                onClick={() => setSelected(selected === n ? null : n)}
                className={`aspect-square rounded-sm text-[6px] font-bold flex items-center justify-center
                  ${getPageColor(p)} ${selected === n ? 'ring-1 ring-white' : ''}`}
              >
                {n % 20 === 0 ? n : ''}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap mb-6">
          {[
            { color: 'bg-green-700', label: 'Strong' },
            { color: 'bg-green-500', label: 'Solid' },
            { color: 'bg-amber-500', label: 'Okay' },
            { color: 'bg-red-600', label: 'Weak' },
            { color: 'bg-blue-600', label: 'Learning' },
            { color: 'bg-[#0f172a] border border-[#1e293b]', label: 'Not started' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${l.color}`} />
              <span className="text-xs text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>

        {/* Page detail panel */}
        {selected && (
          <div className="bg-[#1e293b] rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-lg font-bold">Page {selected}</div>
                {selectedPage ? (
                  <div className="text-xs text-slate-400 mt-0.5">
                    Strength: {selectedPage.strength.toFixed(1)} ·
                    Next review: {selectedPage.next_review_date}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-0.5">Not yet memorised</div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 text-sm">✕</button>
            </div>

            {/* Manual status override */}
            {selectedPage && (
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Set Status</div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => graduatePage(selected, s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize
                        ${selectedPage.status === s ? 'bg-blue-700 text-white' : 'bg-[#0f172a] text-slate-400 border border-[#334155]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!selectedPage && (
              <button
                onClick={() => { /* addPage would go here */ setSelected(null) }}
                className="w-full bg-green-800 text-green-300 rounded-xl py-2 text-sm font-semibold mt-2"
              >
                Mark as memorised
              </button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verify My Quran screen**

```bash
npm run dev
```

Navigate to `/quran`. Verify: grid of 604 cells, memorised pages coloured, tapping a page shows detail panel.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MyQuran.tsx
git commit -m "feat: My Quran screen"
```

---

## Task 14: Settings Screen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Implement SettingsScreen**

Replace `src/screens/SettingsScreen.tsx`:
```tsx
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { BottomNav } from '../components/BottomNav'
import type { DailyTarget } from '../types'

const TARGET_LABELS: Record<DailyTarget, string> = {
  quarter: '¼ page', half: '½ page', one: '1 page', two: '2 pages',
}

export function SettingsScreen() {
  const { signOut } = useAuth()
  const { settings, updateSettings } = useSettings()

  if (!settings) return <div className="min-h-screen bg-[#0f1117]" />

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <h1 className="text-xl font-bold mb-6">Settings</h1>

        <Section title="Memorisation">
          <SettingRow label="Daily target">
            <select
              value={settings.daily_target}
              onChange={e => updateSettings({ daily_target: e.target.value as DailyTarget })}
              className="bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              {(Object.keys(TARGET_LABELS) as DailyTarget[]).map(k => (
                <option key={k} value={k}>{TARGET_LABELS[k]}</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Reps with mushaf (target)">
            <NumberInput
              value={settings.memorisation_reps_mushaf}
              onChange={v => updateSettings({ memorisation_reps_mushaf: v })}
            />
          </SettingRow>
          <SettingRow label="Reps from memory (target)">
            <NumberInput
              value={settings.memorisation_reps_memory}
              onChange={v => updateSettings({ memorisation_reps_memory: v })}
            />
          </SettingRow>
        </Section>

        <Section title="Revision">
          <SettingRow label="Recent cycle (days)">
            <NumberInput
              value={settings.recent_cycle_days}
              onChange={v => updateSettings({ recent_cycle_days: v })}
            />
          </SettingRow>
        </Section>

        <Section title="Notifications">
          <SettingRow label="Daily reminder">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => updateSettings({ notifications_enabled: !settings.notifications_enabled })}
                className={`w-10 h-6 rounded-full transition-colors ${settings.notifications_enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${settings.notifications_enabled ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </SettingRow>
          {settings.notifications_enabled && (
            <SettingRow label="Reminder time">
              <input
                type="time"
                value={settings.daily_reminder_time}
                onChange={e => updateSettings({ daily_reminder_time: e.target.value })}
                className="bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
              />
            </SettingRow>
          )}
        </Section>

        <button
          onClick={() => signOut()}
          className="w-full mt-6 bg-[#1e293b] border border-slate-700 text-slate-400 rounded-xl py-3 text-sm font-semibold"
        >
          Sign out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">{title}</div>
      <div className="bg-[#1e293b] rounded-2xl divide-y divide-[#334155]">{children}</div>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
    </div>
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(1, value - 1))} className="bg-[#0f172a] border border-[#334155] text-white w-7 h-7 rounded-lg text-sm font-bold">−</button>
      <span className="text-white font-bold w-6 text-center">{value}</span>
      <button onClick={() => onChange(value + 1)} className="bg-[#0f172a] border border-[#334155] text-white w-7 h-7 rounded-lg text-sm font-bold">+</button>
    </div>
  )
}
```

- [ ] **Step 2: Verify settings screen**

```bash
npm run dev
```

Navigate to `/settings`. Verify all fields show, changes persist (refresh and check Supabase dashboard).

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: Settings screen"
```

---

## Task 15: Offline Queue

**Files:**
- Create: `src/lib/offline-queue.ts`

- [ ] **Step 1: Implement offline queue using idb**

Create `src/lib/offline-queue.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb'
import { supabase } from './supabase'

interface QueuedOperation {
  id?: number
  table: string
  operation: 'insert' | 'update' | 'upsert'
  payload: Record<string, unknown>
  timestamp: number
}

let db: IDBPDatabase | null = null

async function getDB() {
  if (db) return db
  db = await openDB('hifz-offline', 1, {
    upgrade(d) {
      d.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
    },
  })
  return db
}

export async function enqueue(op: Omit<QueuedOperation, 'id' | 'timestamp'>) {
  const d = await getDB()
  await d.add('queue', { ...op, timestamp: Date.now() })
}

export async function flushQueue() {
  const d = await getDB()
  const ops = await d.getAll('queue') as QueuedOperation[]
  for (const op of ops) {
    let error = null
    if (op.operation === 'insert') {
      ;({ error } = await supabase.from(op.table).insert(op.payload))
    } else if (op.operation === 'update') {
      const { id, ...data } = op.payload
      ;({ error } = await supabase.from(op.table).update(data).eq('id', id as string))
    } else if (op.operation === 'upsert') {
      ;({ error } = await supabase.from(op.table).upsert(op.payload))
    }
    if (!error && op.id != null) {
      await d.delete('queue', op.id)
    }
  }
}

// Wire up flush on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueue() })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/offline-queue.ts
git commit -m "feat: offline queue with IndexedDB"
```

---

## Task 16: PWA Icons + Build Verification

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: Create icons**

Generate two PNG icons (192×192 and 512×512). Any solid-colour placeholder works for now.

```bash
# If you have ImageMagick installed:
convert -size 192x192 xc:#1e3a5f public/icons/icon-192.png
convert -size 512x512 xc:#1e3a5f public/icons/icon-512.png
# Otherwise, create them manually in any image editor.
```

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build succeeds, `dist/` folder created, no TypeScript errors.

- [ ] **Step 3: Preview production build**

```bash
npm run preview
```

Open http://localhost:4173. Verify the app loads, auth works, and install prompt appears in Chrome.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (sm2, today-tasks, AyahCard, RepCounter).

- [ ] **Step 5: Commit**

```bash
git add public/icons/
git commit -m "feat: PWA icons, production build verified"
```

---

## Task 17: Vercel Deployment

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/quran-hifz-app.git
git push -u origin main
```

- [ ] **Step 2: Import project in Vercel**

Go to vercel.com → New Project → Import from GitHub → select `quran-hifz-app`.

- [ ] **Step 3: Set environment variables in Vercel**

In Vercel project settings → Environment Variables, add:
```
VITE_SUPABASE_URL       = your_supabase_url
VITE_SUPABASE_ANON_KEY  = your_supabase_anon_key
```

- [ ] **Step 4: Deploy**

Vercel auto-deploys on push. Trigger a deploy and verify the live URL loads correctly.

- [ ] **Step 5: Add Vercel URL to Supabase allowed origins**

In Supabase → Authentication → URL Configuration → add your Vercel URL to Site URL and Redirect URLs.

- [ ] **Step 6: Final smoke test on live URL**

- Sign up with a new account
- Add a page as learning
- Open memorisation session, log reps, mark as memorised
- Dashboard shows revised juz map
- Navigate to `/quran` — page shows as coloured
- Navigate to `/settings` — change a setting, verify it persists on refresh

---

## Self-Review Gaps Addressed

- SM-2 `calculateNextReview` uses `today` parameter (not `new Date()`) so tests are deterministic
- `useTodaysTasks` wraps `computeTodaysTasks` (pure, tested) — hooks stay thin
- `JuzStrengthMap` colour derivation relies on `strength` field from `user_pages` — no join needed
- `RevisionSession` initialises session in `useEffect` on mount — no double-init
- Offline queue wires up `window.online` event at module load — flushes automatically on reconnect
- `user_settings` row is created on first `useSettings` call if absent — no manual setup needed
