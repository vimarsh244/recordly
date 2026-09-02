import { formatBytes, formatDuration } from '../../lib/format'
import { recordingEngine } from '../../media/recording/engine'
import type { EngineState } from '../../media/recording/types'

export function RecordingBar({ state }: { state: EngineState }) {
  const paused = state.status === 'paused'
  const stopping = state.status === 'stopping'

  return (
    <div className="panel">
      <div className="recbar">
        <span className={`rec-dot ${paused ? 'paused' : 'live'}`} aria-hidden="true" />
        <span className="timer" role="timer" aria-label="Recording time">
          {formatDuration(state.durationMs)}
        </span>
        <span className="spacer" />
        {state.hasMic ? (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => recordingEngine.setMicMuted(!state.micMuted)}
            aria-pressed={state.micMuted}
          >
            {state.micMuted ? 'Unmute' : 'Mute'}
          </button>
        ) : null}
        <button
          className="btn btn-sm"
          onClick={() => (paused ? recordingEngine.resume() : recordingEngine.pause())}
          disabled={stopping}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn btn-sm btn-primary" onClick={() => void recordingEngine.stop()} disabled={stopping}>
          {stopping ? 'Saving' : 'Stop'}
        </button>
      </div>
      <div className="note">
        {stopping ? 'Finishing the recording.' : 'Recording continues while you use other tabs and apps.'}
        {state.bytes > 0 ? ` ${formatBytes(state.bytes)} saved.` : ''}
      </div>
    </div>
  )
}
