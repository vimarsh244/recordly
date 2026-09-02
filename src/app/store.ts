import { create } from 'zustand'
import { defaultEdits, type Edits } from '../features/project/types'
import type { Recording } from '../media/recording/types'
import { applyTheme, loadSettings, saveSettings, type Settings } from './settings'
import { putProject } from '../storage/indexeddb/db'

interface AppState {
  settings: Settings
  recording: Recording | null
  edits: Edits
  past: Edits[]
  future: Edits[]
  updateSettings(patch: Partial<Settings>): void
  openRecording(recording: Recording, edits?: Edits): void
  renameRecording(name: string): void
  closeRecording(): void
  commitEdits(patch: Partial<Edits>): void
  previewEdits(patch: Partial<Edits>): void
  undo(): void
  redo(): void
}

const HISTORY_LIMIT = 50

export const useApp = create<AppState>((set, get) => ({
  settings: loadSettings(),
  recording: null,
  edits: defaultEdits(0),
  past: [],
  future: [],

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    if (patch.theme) applyTheme(patch.theme)
    set({ settings })
  },

  openRecording(recording, edits) {
    set({
      recording,
      edits: edits ?? defaultEdits(recording.durationMs / 1000),
      past: [],
      future: [],
    })
  },

  renameRecording(name) {
    const recording = get().recording
    if (recording) set({ recording: { ...recording, name } })
  },

  closeRecording() {
    const recording = get().recording
    if (recording) {
      URL.revokeObjectURL(recording.screen.url)
      if (recording.camera) URL.revokeObjectURL(recording.camera.url)
    }
    set({ recording: null, past: [], future: [] })
  },

  // Adds an undo step. Use for finished gestures and discrete changes.
  commitEdits(patch) {
    const { edits, past, recording } = get()
    const next = { ...edits, ...patch }
    set({ edits: next, past: [...past, edits].slice(-HISTORY_LIMIT), future: [] })
    if (recording) {
      void putProject({ sessionId: recording.sessionId, updatedAt: Date.now(), edits: next }).catch(() => undefined)
    }
  },

  // No undo step. Use while a slider or handle is being dragged.
  previewEdits(patch) {
    set({ edits: { ...get().edits, ...patch } })
  },

  undo() {
    const { past, future, edits } = get()
    const previous = past[past.length - 1]
    if (!previous) return
    set({ edits: previous, past: past.slice(0, -1), future: [edits, ...future].slice(0, HISTORY_LIMIT) })
  },

  redo() {
    const { past, future, edits } = get()
    const next = future[0]
    if (!next) return
    set({ edits: next, past: [...past, edits].slice(-HISTORY_LIMIT), future: future.slice(1) })
  },
}))
