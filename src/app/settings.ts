import type { QualityLevel } from '../media/recording/quality'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type CameraShape = 'circle' | 'rounded' | 'square'
export type CameraSize = 'small' | 'medium' | 'large'
export type CameraPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface Settings {
  theme: ThemeChoice
  mic: boolean
  micDeviceId?: string
  camera: boolean
  cameraDeviceId?: string
  systemAudio: boolean
  countdownSeconds: number
  quality: QualityLevel
  frameRate: number
  maxDurationMinutes: number | null
  cameraShape: CameraShape
  cameraSize: CameraSize
  cameraPosition: CameraPosition
}

export const defaultSettings: Settings = {
  theme: 'system',
  mic: false,
  camera: false,
  systemAudio: true,
  countdownSeconds: 3,
  quality: 'high',
  frameRate: 30,
  maxDurationMinutes: null,
  cameraShape: 'circle',
  cameraSize: 'medium',
  cameraPosition: 'bottom-right',
}

const KEY = 'recordly.settings'
const THEME_KEY = 'recordly.theme'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
    localStorage.setItem(THEME_KEY, settings.theme)
  } catch {
    // Private browsing modes can refuse. Settings are a convenience only.
  }
}

export function applyTheme(theme: ThemeChoice): void {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}
