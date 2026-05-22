import { useSyncExternalStore } from 'react'

export type MushafStyle = 'tajweed' | 'plain' | 'ornate'

export interface DeviceSettings {
  mushafStyle: MushafStyle
  hideMemorise: boolean
  hideRevise: boolean
  repsWeak: number
  repsOkay: number
  repsStrong: number
  revisionDailyLimit: number
  weakDailyLimit: number
}

const KEY = 'device-settings'

const DEFAULTS: DeviceSettings = {
  mushafStyle: 'tajweed',
  hideMemorise: false,
  hideRevise: true,
  repsWeak: 15,
  repsOkay: 10,
  repsStrong: 5,
  revisionDailyLimit: 8,
  weakDailyLimit: 3,
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
