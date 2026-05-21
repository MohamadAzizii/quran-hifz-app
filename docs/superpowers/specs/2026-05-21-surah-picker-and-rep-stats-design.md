# Surah Picker & Rep Stats — Design

Date: 2026-05-21
Status: Approved

## Problem

Two unrelated dashboard improvements:

1. **Memorisation is sequential-only.** The "+ Start memorising a new page" button always picks the next page after the user's highest. The user wants to choose which surah to memorise next, with the chosen surah being the *only* thing in their currently-learning queue.
2. **Reps are recorded but invisible.** Memorisation and revision sessions write rep counts (`reps_with_mushaf`, `reps_from_memory`, `reps_revision`) into `session_ratings`, but those numbers never surface anywhere. The user wants a stats card on the home page showing total reps for a chosen time window.

## Feature 1: Surah Picker

### UX

- The Dashboard's "Currently Learning" / "+ Start memorising" section is replaced with a single button: **"+ Pick a surah to memorise"** (always shown).
- If a surah is currently being learned, the existing "Currently Learning" card keeps showing above the button, unchanged.
- The button routes to `/pick-surah` — a full-screen list of all 114 surahs:
  - Surah number, English name, Arabic name (RTL), juz, page range
  - Search box (filters by English or Arabic name, case-insensitive)
- Tap a surah → confirm modal:
  - No existing `learning` rows: *"Add N pages of {Surah} to your memorisation queue?"*
  - Existing `learning` rows: *"This will end your progress on page X and replace it with {Surah} (N pages). Continue?"*
- On confirm:
  - Delete every `user_pages` row for this user where `status = 'learning'`
  - Insert one `user_pages` row per page in the surah's page range, with `status = 'learning'`, skipping any pages already in `recent`/`memorised`
  - Navigate to `/memorise`

### Edge cases

- All pages of the picked surah are already in `recent`/`memorised`: skip silently; show toast "You've already memorised this surah" and stay on the picker.
- Partial: pick adds only the un-memorised pages.
- The Memorisation screen continues to pick `learningPages[0]` (lowest page number first) — when there's only one surah in learning, that means earliest page of that surah first, which is what the user expects.

### Data layer

New mutation `useReplaceLearningWithSurah(surahNumber)`:

```ts
// Pseudocode
async (surahNumber) => {
  const { startPage, endPage } = SURAHS.find(s => s.number === surahNumber)
  const existing = await sb.from('user_pages').select('page_number, status').eq('user_id', userId)
  const blocked = new Set(existing.filter(p => p.status !== 'learning').map(p => p.page_number))
  const pagesToAdd = range(startPage, endPage).filter(n => !blocked.has(n))

  await sb.from('user_pages').delete().eq('user_id', userId).eq('status', 'learning')
  await sb.from('user_pages').insert(pagesToAdd.map(n => ({
    user_id: userId,
    page_number: n,
    status: 'learning',
    strength: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_date: today(),
    last_reviewed_at: null,
    progress_ayah_key: null,
    graduated_to_recent_at: null,
  })))

  invalidate(['userPages'])
  return pagesToAdd.length
}
```

## Feature 2: Rep Stats Widget

### UX

New card on the Dashboard, between the "Memorised" hero card and "Daily Target":

```
REPETITIONS
[ Today | Week | Month | All ]   ← pills, sticky in localStorage

         247
       total reps

  124 with mushaf · 87 from memory · 36 in revision
```

- Pill values: `today` | `week` (Mon–Sun, local timezone) | `month` (1st of current month → today) | `all`
- Selected pill persists to `localStorage` under `rep-stats-window`
- The three breakdown numbers correspond to the three columns on `session_ratings`

### Data layer

New hook `useRepStats(window)`:

```ts
// Pseudocode
const since = computeWindowStart(window) // null for 'all'
const { data } = await sb
  .from('session_ratings')
  .select('reps_with_mushaf, reps_from_memory, reps_revision, sessions!inner(started_at, user_id)')
  .eq('sessions.user_id', userId)
  .gte('sessions.started_at', since ?? '1970-01-01')

return {
  total: sum(reps_with_mushaf + reps_from_memory + reps_revision),
  withMushaf, fromMemory, revision,
}
```

- Wrapped in React Query, key `['rep-stats', window]`, `staleTime` 30s
- Invalidated whenever a session completes (already hooked in `useSession` — we'll add `queryClient.invalidateQueries(['rep-stats'])` to the completion path)

## Files

- `src/screens/Dashboard.tsx` — swap the "+ Start memorising" button for "+ Pick a surah"; add `<RepStatsCard />`
- `src/screens/SurahPicker.tsx` *(new)* — picker route
- `src/components/RepStatsCard.tsx` *(new)* — the home page widget
- `src/hooks/useUserPages.ts` — add `useReplaceLearningWithSurah`
- `src/hooks/useRepStats.ts` *(new)*
- `src/hooks/useSession.ts` — invalidate `rep-stats` query on session completion
- `src/App.tsx` — register `/pick-surah` route
- `src/lib/surahs.ts` — already has the data (114 surahs with `startPage`/`endPage`); no change needed

## Out of scope

- Reordering or pausing learning queues (only one surah at a time; replace-with-warning covers switching)
- Page-level picker (just surah-level for now)
- Daily/weekly *charts* — only the totals + breakdown for the chosen window
- Per-surah rep breakdowns
