import { useSyncExternalStore } from 'react'

export type MushafStyle = 'tajweed' | 'plain' | 'ornate'

export interface DeviceSettings {
  mushafStyle: MushafStyle
  hideMemorise: boolean
  hideRevise: boolean
  repsWeak: number
  repsOkay: number
  repsStrong: number
  readingCursor: number
  readingLoops: number
  // The last day the user finished a juz in the reading flow. While this
  // equals today, reading is locked — they get a "well done" screen instead.
  readingLastCompletedDate: string
  // Algorithm-revision batch snapshot for the current day. The 4 page_numbers
  // are picked once when the session is first opened today and stay frozen so
  // mid-session/cross-session re-entries preserve which pages are still pending.
  algoBatchDate: string
  algoBatchPages: number[]
  algoBatchDone: number[]
}

const KEY = 'device-settings'

const DEFAULTS: DeviceSettings = {
  mushafStyle: 'tajweed',
  hideMemorise: false,
  hideRevise: true,
  repsWeak: 15,
  repsOkay: 10,
  repsStrong: 5,
  readingCursor: 0,
  readingLoops: 0,
  readingLastCompletedDate: '',
  algoBatchDate: '',
  algoBatchPages: [],
  algoBatchDone: [],
}

function load(): DeviceSettings {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let cache: DeviceSettings = load()
const listeners = new Set<() => void>()

export function setDeviceSettings(patch: Partial<DeviceSettings>) {
  cache = { ...cache, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l())
}

export function useDeviceSettings() {
  const settings = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => cache,
    () => cache
  )
  return { settings, update: setDeviceSettings }
}
