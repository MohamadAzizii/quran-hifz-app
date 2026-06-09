import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'
import { useDeviceSettings, type MushafStyle } from '../hooks/useDeviceSettings'
import { PageTransition } from '../components/PageTransition'
import type { DailyTarget } from '../types'

// Postgres `time` returns "HH:MM:SS"; <input type="time"> needs "HH:MM".
// Keep a local value so the async save/refetch doesn't fight typing.
function TimeInput({
  value,
  onCommit,
}: {
  value: string
  onCommit: (v: string) => void
}) {
  const normalized = (value ?? '').slice(0, 5)
  const [local, setLocal] = useState(normalized)
  useEffect(() => {
    setLocal(normalized)
  }, [normalized])
  return (
    <input
      type="time"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value)
        if (e.target.value) onCommit(e.target.value)
      }}
      className="bg-[#0f131b] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm [color-scheme:dark]"
    />
  )
}

const TARGET_LABELS: Record<DailyTarget, string> = {
  quarter: '¼ page',
  half: '½ page',
  one: '1 page',
  two: '2 pages',
}

const MUSHAF_LABELS: Record<MushafStyle, string> = {
  tajweed: 'Tajweed',
  plain: 'Plain',
  ornate: 'Ornate',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`w-10 h-6 rounded-full transition-colors ${
        on ? 'bg-indigo-500' : 'bg-slate-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white m-1 transition-transform ${
          on ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">
        {title}
      </div>
      <div className="bg-[#151a23] rounded-2xl divide-y divide-[#334155]">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex justify-between items-center gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        {children}
      </div>
      {hint && (
        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{hint}</p>
      )}
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
        className="bg-[#0f131b] border border-white/[0.08] text-white w-7 h-7 rounded-lg text-sm font-bold"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="text-white font-bold w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="bg-[#0f131b] border border-white/[0.08] text-white w-7 h-7 rounded-lg text-sm font-bold"
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
  const { settings: device, update: updateDevice } = useDeviceSettings()

  if (!settings) return <div className="min-h-screen bg-[#0b0e14]" />

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#0b0e14] text-white pb-24 md:pb-10">
      <div className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-8 pt-5 md:pt-10">
        <h1 className="text-xl font-bold mb-6">Settings</h1>

        <Section title="Memorisation">
          <SettingRow label="Daily target">
            <select
              value={settings.daily_target}
              onChange={(e) =>
                updateSettings({ daily_target: e.target.value as DailyTarget })
              }
              className="bg-[#0f131b] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm"
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
          <SettingRow
            label="Recent cycle (days)"
            hint="After you memorise a page it's a 'Recent' page and shows up for revision every day for this many days, to lock it in. After that it graduates to spaced revision (reviewed less and less often as it gets stronger)."
          >
            <NumberInput
              value={settings.recent_cycle_days}
              onChange={(v) => updateSettings({ recent_cycle_days: v })}
            />
          </SettingRow>
          <SettingRow label="Suggested reps · Weak">
            <NumberInput
              value={device.repsWeak}
              onChange={(v) => updateDevice({ repsWeak: v })}
            />
          </SettingRow>
          <SettingRow label="Suggested reps · Okay">
            <NumberInput
              value={device.repsOkay}
              onChange={(v) => updateDevice({ repsOkay: v })}
            />
          </SettingRow>
          <SettingRow label="Suggested reps · Strong">
            <NumberInput
              value={device.repsStrong}
              onChange={(v) => updateDevice({ repsStrong: v })}
            />
          </SettingRow>
        </Section>

        <Section title="Display">
          <SettingRow label="Mushaf style">
            <select
              value={device.mushafStyle}
              onChange={(e) =>
                updateDevice({ mushafStyle: e.target.value as MushafStyle })
              }
              className="bg-[#0f131b] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm"
            >
              {(Object.keys(MUSHAF_LABELS) as MushafStyle[]).map((k) => (
                <option key={k} value={k}>
                  {MUSHAF_LABELS[k]}
                </option>
              ))}
            </select>
          </SettingRow>
        </Section>

        <Section title="Test yourself (start hidden)">
          <SettingRow label="Hide page in memorisation">
            <Toggle
              on={device.hideMemorise}
              onToggle={() => updateDevice({ hideMemorise: !device.hideMemorise })}
            />
          </SettingRow>
          <SettingRow label="Hide page in revision">
            <Toggle
              on={device.hideRevise}
              onToggle={() => updateDevice({ hideRevise: !device.hideRevise })}
            />
          </SettingRow>
        </Section>

        <Section title="Notifications">
          <SettingRow label="Daily reminder">
            <Toggle
              on={settings.notifications_enabled}
              onToggle={() =>
                updateSettings({
                  notifications_enabled: !settings.notifications_enabled,
                })
              }
            />
          </SettingRow>
          {settings.notifications_enabled && (
            <SettingRow label="Reminder time">
              <TimeInput
                value={settings.daily_reminder_time}
                onCommit={(v) => updateSettings({ daily_reminder_time: v })}
              />
            </SettingRow>
          )}
        </Section>

        <button
          onClick={() => signOut()}
          className="w-full mt-6 bg-[#151a23] border border-slate-700 text-slate-400 rounded-xl py-3 text-sm font-semibold"
        >
          Sign out
        </button>
      </div>
    </div>
    </PageTransition>
  )
}
