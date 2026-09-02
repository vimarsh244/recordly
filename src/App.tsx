import { useEffect, useState } from 'react'
import { useApp } from './app/store'
import { applyTheme } from './app/settings'
import { CameraPreview } from './features/recorder/CameraPreview'
import { RecorderPanel } from './features/recorder/RecorderPanel'
import { RecentRecordings } from './features/recorder/RecentRecordings'
import { RecoveryBanner } from './features/recorder/RecoveryBanner'
import { SettingsDialog } from './features/recorder/SettingsDialog'
import { EditorView } from './features/editor/EditorView'
import { recordingEngine } from './media/recording/engine'
import { useEngineState } from './features/recorder/useEngine'
import { getProject } from './storage/indexeddb/db'
import type { Edits } from './features/project/types'

export function App() {
  const recording = useApp((state) => state.recording)
  const theme = useApp((state) => state.settings.theme)
  const openRecording = useApp((state) => state.openRecording)
  const closeRecording = useApp((state) => state.closeRecording)
  const engine = useEngineState()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => applyTheme(theme), [theme])

  useEffect(
    () =>
      recordingEngine.onFinished((finished) => {
        void getProject(finished.sessionId)
          .then((project) => openRecording(finished, (project?.edits as Edits | undefined) ?? undefined))
          .catch(() => openRecording(finished))
        setReloadKey((key) => key + 1)
      }),
    [openRecording],
  )

  // A reload during capture loses whatever has not been written yet.
  useEffect(() => {
    const active = engine.status === 'recording' || engine.status === 'paused'
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [engine.status])

  const idle = engine.status === 'idle'

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="brand"
          title="Home"
          aria-label="Home"
          onClick={closeRecording}
          disabled={!recording}
        >
          <span className="brand-dot" aria-hidden="true" />
          Recordly
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
        <a
          className="btn btn-sm btn-ghost"
          href="https://github.com/vimarsh244/recordly"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </header>

      <main className="main">
        {recording ? (
          <EditorView recording={recording} />
        ) : (
          <div style={{ width: '100%', maxWidth: 460 }}>
            <RecoveryBanner onResolved={() => setReloadKey((key) => key + 1)} />
            <RecorderPanel />
            <RecentRecordings reloadKey={reloadKey} />
          </div>
        )}
      </main>

      <footer className="footer">
        Everything runs on device.
      </footer>

      {idle || engine.status === 'countdown' || engine.status === 'starting' ? <CameraPreview /> : null}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
