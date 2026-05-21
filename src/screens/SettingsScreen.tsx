import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { PageTransition } from '../components/PageTransition'
import type { DailyTarget } from '../types'

const TARGET_LABELS: Record<DailyTarget, string> = {
  quarter: '¼ page',
  half: '½ page',
  one: '1 page',
  two: '2 pages',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">
        {title}
      </div>
      <div className="bg-[#1e293b] rounded-2xl divide-y divide-[#334155]">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="bg-[#0f172a] border border-[#334155] text-white w-7 h-7 rounded-lg text-sm font-bold"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="text-white font-bold w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="bg-[#0f172a] border border-[#334155] text-white w-7 h-7 rounded-lg text-sm font-bold"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

export function SettingsScreen() {
  const { signOut } = useAuth()
  const { settings, updateSettings } = useSettings()

  if (!settings) return <div className="min-h-screen bg-[#0f1117]" />

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0f1117] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <h1 className="text-xl font-bold mb-6">Settings</h1>

        <Section title="Memorisation">
          <SettingRow label="Daily target">
            <select
              value={settings.daily_target}
              onChange={(e) =>
                updateSettings({ daily_target: e.target.value as DailyTarget })
              }
              className="bg-[#0f172a] border border-[#334155] text-white rounded-lg px-3 py-2 text-sm"
            >
              {(Object.keys(TARGET_LABELS) as DailyTarget[]).map((k) => (
                <option key={k} value={k}>
                  {TARGET_LABELS[k]}
                </option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Reps with mushaf (target)">
            <NumberInput
              value={settings.memorisation_reps_mushaf}
              onChange={(v) => updateSettings({ memorisation_reps_mushaf: v })}
            />
          </SettingRow>
          <SettingRow label="Reps from memory (target)">
            <NumberInput
              value={settings.memorisation_reps_memory}
              onChange={(v) => updateSettings({ memorisation_reps_memory: v })}
            />
          </SettingRow>
        </Section>

        <Section title="Revision">
          <SettingRow label="Recent cycle (days)">
            <NumberInput
              value={settings.recent_cycle_days}
              onChange={(v) => updateSettings({ recent_cycle_days: v })}
            />
          </SettingRow>
        </Section>

        <Section title="Notifications">
          <SettingRow label="Daily reminder">
            <button
              onClick={() =>
                updateSettings({
                  notifications_enabled: !settings.notifications_enabled,
                })
              }
              aria-pressed={settings.notifications_enabled}
              className={`w-10 h-6 rounded-full transition-colors ${
                settings.notifications_enabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${
                  settings.notifications_enabled ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </SettingRow>
          {settings.notifications_enabled && (
            <SettingRow label="Reminder time">
              <input
                type="time"
                value={settings.daily_reminder_time}
                onChange={(e) =>
                  updateSettings({ daily_reminder_time: e.target.value })
                }
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
    </div>
    </PageTransition>
  )
}
