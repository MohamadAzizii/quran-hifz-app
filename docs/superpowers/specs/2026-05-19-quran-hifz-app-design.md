# Quran Hifz App — Design Spec
**Date:** 2026-05-19  
**Status:** Approved

---

## Overview

A personal Quran memorisation and revision companion — a Progressive Web App (PWA) that helps the user memorise new pages, track repetitions, and schedule revision using a hybrid spaced repetition system. Built for one user (personal tool), installable on phone and laptop, works offline.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite (PWA, service worker) |
| Styling | Tailwind CSS |
| Backend / Auth / DB | Supabase (Postgres + Auth + Realtime) |
| Deployment | Vercel |
| Quran text | Tanzil.net Uthmani dataset (loaded once into Supabase, no runtime API dependency) |

**Offline strategy:** All session interactions (rep logs, ratings) are queued locally and synced to Supabase when back online. Quran text is cached on first load via service worker.

---

## Revision System

Three tiers — hybrid approach:

### 1. New (Daily)
Pages the user is actively memorising. They appear on the dashboard every day until manually graduated. The user sets a daily memorisation target (¼, ½, 1, or 2 pages/day).

### 2. Recent (Fixed Cycle)
Pages memorised within the last ~2 weeks. Reviewed on a short fixed cycle (configurable, default every 3 days). A page graduates to the spaced pool after 5 consecutive `okay` or `strong` ratings.

### 3. Spaced (SM-2 Algorithm)
All older memorised pages. Scheduled using the SM-2 spaced repetition algorithm. After each session, the user's strong/okay/weak rating updates:
- `interval_days` — how many days until next review
- `strength` — SM-2 easiness factor (0–5)
- `repetitions` — successful review streak

**Rating → rep suggestion mapping (revision):**
- Weak → 5 reps suggested
- Okay → 3 reps suggested
- Strong → 1 rep suggested

The user rates each page manually after reciting — Weak, Okay, or Strong.

---

## Data Model

### `pages` (reference, 604 rows)
| Column | Type | Notes |
|---|---|---|
| page_number | int PK | 1–604 |
| juz | int | 1–30 |
| hizb | int | 1–60 |
| surah_name | text | Primary surah on this page |
| first_ayah | text | e.g. "2:5" |
| last_ayah | text | |

### `user_pages`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | Supabase auth user |
| page_number | int FK | |
| status | enum | `learning` / `recent` / `memorised` |
| strength | float | SM-2 easiness factor, default 2.5 |
| interval_days | int | Current SM-2 interval |
| repetitions | int | Consecutive successful reviews |
| next_review_date | date | Scheduled by SM-2 |
| last_reviewed_at | timestamp | |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| type | enum | `memorisation` / `revision` |
| started_at | timestamp | |
| completed_at | timestamp | |
| total_pages | int | |

### `session_ratings`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| page_number | int | |
| rating | enum | `strong` / `okay` / `weak` |
| reps_with_mushaf | int | Memorisation sessions only |
| reps_from_memory | int | Memorisation sessions only |
| reps_revision | int | Revision sessions only |

### `ayah_cache`
| Column | Type | Notes |
|---|---|---|
| page_number | int | |
| ayah_key | text | e.g. "2:5" |
| text_uthmani | text | From tanzil dataset |

### `user_settings`
| Column | Type | Default |
|---|---|---|
| user_id | uuid PK | |
| daily_target | enum | `quarter` / `half` / `one` / `two` — default `half` |
| memorisation_reps_mushaf | int | 12 |
| memorisation_reps_memory | int | 8 |
| recent_cycle_days | int | 3 |
| notifications_enabled | bool | true |
| daily_reminder_time | time | 08:00 |

---

## Screens

### 1. Dashboard
The home screen. Shows on open.

**Sections:**
- Streak + overall progress banner (juz memorised, % of 604 pages, progress bar)
- Daily memorisation target selector (¼ / ½ / 1 / 2 page chips)
- **New Memorisation card** (prominent, green) — currently learning page(s), rep progress dots (with mushaf + from memory), "Log a rep" / "Mark memorised" / "Start next page" actions
- **Today's Revision** — Recent pages card + Spaced pages card, each showing page range, surah, suggested rep count
- **Juz Strength Map** — 30-cell grid, colour-coded: solid (dark green), okay (amber), weak (red), partial (orange), learning (blue), not started (dark grey)
- "Start Today's Revision" CTA button

**Juz strength** is derived from the average `strength` score of all `user_pages` in that juz.

### 2. Memorisation Session
Entered from the New Memorisation card on the dashboard.

**Flow:**
1. Shows the current page's ayah text (from `ayah_cache`)
2. "Hide text" toggle — covers the text so user can test themselves
3. Two rep counters:
   - **With Mushaf** (blue) — user taps after each reading with the text visible
   - **From Memory** (purple) — user taps after each recitation without looking
4. Each counter shows dot-by-dot progress toward the user's target (set in settings)
5. "Mark as Memorised" graduates the page to `status: recent` and enters it into the revision system
6. "Start next page" available once current page is graduated

**Rep targets** are set globally in Settings but can be overridden per-session with a "Change target" shortcut.

### 3. Revision Session
Entered from "Start Today's Revision" on the dashboard. Covers all due pages (recent + spaced) in one session.

**Flow per page:**
1. Progress bar at top (page X of Y)
2. Page info — surah, juz, type (recent/spaced), last reviewed date
3. Ayah text — **hidden by default**, user recites first, then taps to reveal and check
4. Rating buttons — Weak / Okay / Strong
5. Suggested reps appear after rating (weak → 5, okay → 3, strong → 1)
6. Rep counter — user taps "+ Log rep" for each repetition
7. "Next page" advances; "Skip" skips without rating (page stays due)

After the session completes, SM-2 algorithm runs on all rated pages and updates `next_review_date` and `interval_days`.

### 4. My Quran
A full page-by-page view of all 604 pages, grouped by juz.

**Contents:**
- Each page shown as a cell with colour coded by strength
- Tap a page to see: status, strength score, next review date, session history
- Ability to manually set a page's status (e.g. to backfill memorised pages)

### 5. Settings
- Daily memorisation target
- Memorisation rep targets (with mushaf / from memory)
- Recent cycle days
- Notification toggle + reminder time
- Account (Supabase auth — email login)

---

## SM-2 Algorithm

Standard SM-2 implementation:

```
// rating: 0 (weak) → 2 (okay) → 5 (strong)
// mapped from: weak=1, okay=3, strong=5

if rating >= 3:
  if repetitions == 0: interval = 1
  elif repetitions == 1: interval = 6
  else: interval = round(interval * easiness)
  repetitions += 1
else:
  repetitions = 0
  interval = 1

easiness = max(1.3, easiness + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
next_review_date = today + interval days
```

---

## Notifications

Smart notifications via PWA Push API + Supabase Edge Function:
- Triggered daily at the user's set reminder time
- Only fires if there are pages due that day
- Message: "You have X pages due today. Keep your hifz strong."

---

## PWA Configuration

- Service worker caches: app shell, Quran text (`ayah_cache`), static assets
- Offline queue: session ratings stored in IndexedDB, synced on reconnect
- Installable on iOS (Safari Add to Home Screen) and Android (Chrome install prompt)
- Manifest: Arabic-friendly, dark theme

---

## Out of Scope

- Speech recognition / recitation checking
- Teacher/student sharing
- Multiple user profiles
- Social features
