# Hifz Companion — Setup

PWA Quran memorisation companion. React + Vite + Supabase.

## 1. Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. From the project dashboard, copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` (only for seeding)

3. In the SQL Editor, run these two files in order:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_progress_and_ordinal.sql`

4. Under Authentication → URL Configuration, add your eventual production URL to **Site URL** and **Redirect URLs** (when you deploy).

## 2. Environment variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
```

The service role key is needed for the seed script only. Do not commit `.env.local`.

## 3. Install & seed

```bash
npm install
npx tsx supabase/seed/seed-quran.ts
```

The seed fetches the full Quran (Uthmani edition) from `api.alquran.cloud` in one bulk call (~20–40 seconds), then upserts 604 pages + 6236 ayahs.

Verify in Supabase:

```sql
select count(*) from pages;        -- expect 604
select count(*) from ayah_cache;   -- expect 6236
```

## 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign up with email + password (Supabase's email confirmation is enabled by default — turn it off in Auth settings if you want instant access during testing).

## 5. Tests & build

```bash
npx vitest run        # all tests
npm run build         # production build
npm run preview       # serve the production build locally
```

## 6. Deploy to Vercel

1. Push to GitHub.
2. In Vercel: New Project → import the repo.
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. After deploying, add your Vercel URL to Supabase → Authentication → URL Configuration → Site URL + Redirect URLs.

Vercel auto-deploys on push to `main` thereafter.

## What's in the app

- **Dashboard** — progress (memorised juz, % complete), daily target (¼ / ½ / 1 / 2 page), today's revision summary, juz strength map, start-revision CTA.
- **Memorisation session** — partial-page flow: portion size derived from your daily target; track reps with mushaf and from memory; mark portion done; auto-graduate to "recent" when the page is fully memorised.
- **Revision session** — for due pages: hold-to-reveal ayah card, rate weak/okay/strong, suggested reps (15/10/5), SM-2 schedules next review.
- **My Quran** — 604-page strength grid; tap to set status.
- **Settings** — daily target, rep targets, recent-cycle days, reminder time.

## Behaviour notes

- After `recent_cycle_days` days in `recent` with strength ≥ 2.5, a page auto-graduates to `memorised` on next dashboard load.
- Mutations are queued to IndexedDB when offline and flushed on reconnect / next sign-in.
- Ayahs are cached in IndexedDB per page after first load.
- SM-2 intervals are clamped to ≥ 1 day. Strength is clamped to ≥ 1.3.

## Known follow-ups

- Placeholder PWA icons (solid colour). Replace `public/icons/icon-192.png` and `icon-512.png` before shipping.
- Email/password is the only auth flow. Add Google OAuth via Supabase if desired.
- Auto-graduation runs on dashboard load. For multi-device users, consider a Supabase Edge Function cron later.
