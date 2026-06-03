import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../components/PageTransition'
import { useUserPagesQuery } from '../hooks/useUserPages'
import { getTodaysFocus, type UserPageWithJuz } from '../lib/recovery-plan'

const PRIORITY = [
  { juz: 'Juz 30', detail: 'Rebuild from scratch — used most in salah' },
  { juz: 'Juz 29', detail: 'Maintain and solidify' },
  { juz: 'Juz 28', detail: 'Iron out the weak surahs' },
  { juz: 'Juz 27', detail: 'Recover what’s there' },
  { juz: 'Juz 26', detail: 'Same' },
  { juz: 'Surah Yaseen', detail: 'Dedicated attention' },
  { juz: 'Juz 25', detail: 'Last — most recently memorised, most gone' },
]

const SCHEDULE = [
  { time: '6:30 – 7:00 PM', label: 'Dinner with family', note: 'Protected. Don’t touch this.' },
  { time: '7:00 – 8:30 PM', label: 'Hifz session — 90 minutes', note: 'Non-negotiable. Primary window.' },
  { time: '8:30 – 9:00 PM', label: 'Wind down, leave for mosque', note: '' },
]

const SESSION = [
  {
    dur: 'First 20 min',
    label: 'New revision juz',
    body: 'Recite out loud from memory. Every stumble: look, close, repeat until it flows. Move forward.',
  },
  {
    dur: 'Next 60 min',
    label: 'Sheikh’s protocol',
    body: '10 pages, 10 repetitions each. Out loud. Always out loud — silent revision is weaker.',
  },
  {
    dur: 'Final 10 min',
    label: 'Salah prep',
    body: 'Pick one weak surah you’ll recite in Maghrib or Isha tonight.',
  },
]

const WEEKLY = [
  { day: 'Saturday', focus: 'Juz 30' },
  { day: 'Sunday', focus: 'Juz 30' },
  { day: 'Monday', focus: 'Juz 29' },
  { day: 'Tuesday', focus: 'Juz 28' },
  { day: 'Wednesday', focus: 'Juz 27' },
  { day: 'Thursday', focus: 'Juz 26' },
  { day: 'Friday', focus: 'Full weak surah day — Yaseen + anything fragile' },
]

const METRICS = [
  'How many days did I complete the 90 minute session? (Target: 7/7)',
  'How many prayers did I recite from my weak list? (Target: 25+/35)',
  'Did I have the sheikh conversation? (Yes/No)',
  'Which juz feels stronger than last week?',
]

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{eyebrow}</div>
      {title && <h2 className="text-base font-bold mb-3">{title}</h2>}
      {children}
    </div>
  )
}

export function RecoveryPlan() {
  const navigate = useNavigate()
  const { data: pages = [] } = useUserPagesQuery()
  const focus = useMemo(() => getTodaysFocus(pages as UserPageWithJuz[]), [pages])

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0b0e14] text-white pb-24 md:pb-10">
        <div className="max-w-lg md:max-w-3xl mx-auto px-4 md:px-8 pt-5 md:pt-10">
          <button
            onClick={() => navigate('/')}
            className="bg-[#151a23] text-slate-400 rounded-lg px-3 py-2 text-sm mb-4"
          >
            ← Back
          </button>

          <div className="mb-2 text-xs uppercase tracking-widest text-amber-400/80">
            Phase 1 · Weeks 1–6
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Your Hifz Recovery Plan</h1>
          <p className="text-slate-400 text-sm mb-6">Zero new memorisation. Revision only.</p>

          <div className="glass rounded-3xl p-5 mb-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
            <div className="text-[10px] uppercase tracking-widest text-purple-300/90 mb-1">
              Today · {focus.dayName}
            </div>
            <div className="text-xl font-bold mb-1">{focus.focusLabel}</div>
            <div className="text-xs text-slate-400 mb-4">
              {focus.totalAvailable === 0
                ? `No pages from ${focus.focusLabel} in your hifz yet.`
                : focus.sessionPages.length === focus.totalAvailable
                  ? `${focus.totalAvailable} page${focus.totalAvailable === 1 ? '' : 's'} in your hifz — all included in today's session.`
                  : `${focus.sessionPages.length} weakest pages selected from ${focus.totalAvailable} in your hifz.`}
            </div>
            <button
              onClick={() => navigate('/revise/session')}
              disabled={focus.sessionPages.length === 0}
              className="btn-gradient w-full text-white rounded-xl py-3 text-sm font-bold disabled:opacity-40"
            >
              {focus.sessionPages.length === 0
                ? 'Add pages first'
                : 'Start today’s 90-min session →'}
            </button>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
              Ratings still update each page’s strength and review schedule.
              Sheikh’s protocol: 10 pages, 10 reps each, out loud.
            </p>
          </div>

          <Section eyebrow="Priority order" title="What to fix, in order">
            <ol className="space-y-2">
              {PRIORITY.map((p, i) => (
                <li
                  key={p.juz}
                  className="flex gap-3 bg-[#0f131b] border border-white/[0.06] rounded-xl px-3 py-2.5"
                >
                  <span className="text-indigo-400 font-bold w-5 text-right">{i + 1}</span>
                  <div>
                    <div className="font-semibold text-sm">{p.juz}</div>
                    <div className="text-xs text-slate-400">{p.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section eyebrow="Daily schedule" title="Post-Asr — 6:30 to 9:00 PM">
            <div className="space-y-2">
              {SCHEDULE.map((s) => (
                <div
                  key={s.time}
                  className="bg-[#0f131b] border border-white/[0.06] rounded-xl p-3"
                >
                  <div className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                    {s.time}
                  </div>
                  <div className="font-semibold text-sm mt-1">{s.label}</div>
                  {s.note && (
                    <div className="text-xs text-slate-500 mt-1">{s.note}</div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              That 90 minutes is your primary window. Every day. No “later.”
            </p>
          </Section>

          <Section eyebrow="Session structure" title="The 90-minute breakdown">
            <div className="space-y-3">
              {SESSION.map((s) => (
                <div
                  key={s.dur}
                  className="bg-[#0f131b] border border-white/[0.06] rounded-xl p-3"
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-purple-400 text-xs font-bold">{s.dur}</div>
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed">{s.body}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="Salah rotation" title="Five prayers a day = 35 a week">
            <p className="text-sm text-slate-300 leading-relaxed">
              Stop recycling the same comfortable surahs. Every single prayer — pick something
              from your weak list. This turns salah into passive revision automatically. Your
              community won’t notice. Your hifz will.
            </p>
          </Section>

          <Section eyebrow="Weekly structure" title="Day-by-day focus">
            <div className="bg-[#0f131b] border border-white/[0.06] rounded-xl divide-y divide-white/[0.06]">
              {WEEKLY.map((w) => (
                <div key={w.day} className="flex items-center px-4 py-2.5">
                  <span className="w-24 text-sm font-semibold">{w.day}</span>
                  <span className="text-sm text-slate-300 flex-1">{w.focus}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="The sheikh conversation" title="Have this before your next lesson">
            <p className="text-sm text-slate-300 leading-relaxed">
              Tell him:{' '}
              <span className="text-white font-semibold">
                “I want to spend 6 weeks on pure revision before adding new memorisation. I want
                to fix the foundation first.”
              </span>
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mt-2">
              He’ll agree. He’s been telling you to start for weeks — he wants you moving, not
              perfect.
            </p>
          </Section>

          <Section eyebrow="Accountability" title="Weekly check, every Friday">
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300 marker:text-indigo-400 marker:font-bold">
              {METRICS.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </Section>

          <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-400/30 rounded-2xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest text-indigo-300 mb-2">
              The one rule that overrides everything
            </div>
            <p className="text-base font-bold leading-snug mb-2">
              The session happens <span className="text-indigo-300">before</span> you sit with
              your family in the evening. Not after. Before.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Right now your pattern is: eat, sit, relax, think about hifz, say “later,” go to
              mosque. Flip it: eat, go straight to the IT room or quiet space, 90 minutes, then
              sit with family for the remaining time guilt-free.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed mt-2">
              You already proved today you can start when you’re in the right environment. The
              mosque IT room works. Use it.
            </p>
          </div>

          <div className="bg-[#151a23] border border-white/[0.06] rounded-2xl p-5 mb-6">
            <div className="text-xs uppercase tracking-widest text-emerald-400/70 mb-2">
              Phase 2 · Week 7 onwards
            </div>
            <div className="text-base font-bold mb-2">Rebuilding</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Once your sheikh confirms juz 28, 29, and 30 are solid — reintroduce half a page
              of new memorisation daily, post-Fajr when winter returns and that window opens
              again. Revision stays at 90 minutes. New memorisation adds 20–30 minutes on top.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
