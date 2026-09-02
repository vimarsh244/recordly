import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../../app/store'
import { clamp, formatBytes } from '../../lib/format'
import { preloadFfmpeg } from '../../media/ffmpeg/client'
import type { Recording } from '../../media/recording/types'
import { CropTool, cropForAspect } from './CropTool'
import { ExportPanel } from './ExportPanel'
import { Timeline } from './Timeline'
import type { CropRect } from '../project/types'

type Tab = 'trim' | 'crop' | 'audio' | 'export'

const ASPECTS: { label: string; value: number | null }[] = [
  { label: 'Free', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '16:10', value: 16 / 10 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9 / 16 },
]

const CAMERA_SIZES = { small: '16%', medium: '22%', large: '30%' }
const CAMERA_RADIUS = { circle: '50%', rounded: '10px', square: '2px' }

export function EditorView({ recording }: { recording: Recording }) {
  const edits = useApp((state) => state.edits)
  const settings = useApp((state) => state.settings)
  const { commitEdits, previewEdits, undo, redo, closeRecording, renameRecording } = useApp.getState()
  const [tab, setTab] = useState<Tab>('trim')
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<HTMLVideoElement>(null)
  const duration = recording.durationMs / 1000

  useEffect(() => preloadFfmpeg(), [])

  // Keep playback inside the trimmed selection, and drive the playhead.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let frame = 0
    const tick = () => {
      if (video.currentTime > edits.trimEnd) {
        video.currentTime = edits.trimStart
        if (!video.paused) void video.play().catch(() => undefined)
      }
      setCurrentTime(video.currentTime)
      const camera = cameraRef.current
      if (camera && Math.abs(camera.currentTime - video.currentTime) > 0.25) camera.currentTime = video.currentTime
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [edits.trimEnd, edits.trimStart])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = edits.muted
    video.volume = clamp(edits.volume, 0, 1)
    video.playbackRate = edits.speed
  }, [edits.muted, edits.volume, edits.speed])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
    setCurrentTime(time)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    const camera = cameraRef.current
    if (!video) return
    if (video.paused) {
      if (video.currentTime < edits.trimStart || video.currentTime >= edits.trimEnd) video.currentTime = edits.trimStart
      void video.play().catch(() => undefined)
      if (camera) void camera.play().catch(() => undefined)
      setPlaying(true)
    } else {
      video.pause()
      camera?.pause()
      setPlaying(false)
    }
  }, [edits.trimEnd, edits.trimStart])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return
      if (event.key === ' ') {
        event.preventDefault()
        togglePlay()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [redo, togglePlay, undo])

  const crop = edits.crop
  const showCropOverlay = tab === 'crop'
  const cropped = crop && !showCropOverlay ? crop : null

  // When a crop is applied, the frame keeps the cropped aspect and the video
  // is scaled up inside it. The crop tab always shows the full frame.
  const frameStyle: React.CSSProperties = cropped
    ? {
        position: 'relative',
        overflow: 'hidden',
        height: '66vh',
        aspectRatio: `${recording.width * cropped.width} / ${recording.height * cropped.height}`,
      }
    : { position: 'relative', overflow: 'hidden', lineHeight: 0 }

  const videoStyle: React.CSSProperties | undefined = cropped
    ? {
        position: 'absolute',
        width: `${100 / cropped.width}%`,
        height: `${100 / cropped.height}%`,
        left: `${(-cropped.x * 100) / cropped.width}%`,
        top: `${(-cropped.y * 100) / cropped.height}%`,
        maxHeight: 'none',
        maxWidth: 'none',
      }
    : undefined

  function setCrop(next: CropRect | null, commit: boolean) {
    if (commit) commitEdits({ crop: next })
    else previewEdits({ crop: next })
  }

  return (
    <div className="panel panel-wide" style={{ padding: 12 }}>
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <button className="btn btn-sm btn-ghost" onClick={closeRecording}>
          Back
        </button>
        <input
          type="text"
          aria-label="Recording name"
          value={recording.name}
          onChange={(event) => renameRecording(event.target.value)}
          style={{ flex: 1, background: 'transparent', border: 0, fontWeight: 600, fontSize: 15 }}
        />
        <span className="meta">{formatBytes(recording.bytes)}</span>
        <button className="btn btn-sm btn-primary" onClick={() => setTab('export')}>
          Download
        </button>
      </div>

      {!recording.persisted ? (
        <div className="banner">
          <span className="msg">This recording is kept in memory only. Download it before you close the tab.</span>
        </div>
      ) : null}

      <div className="editor">
        <div>
          <div className="stage">
            <div style={frameStyle}>
              <video ref={videoRef} src={recording.screen.url} style={videoStyle} playsInline />
              {recording.camera && !showCropOverlay ? (
                <div
                  className="cam-overlay"
                  style={{
                    width: CAMERA_SIZES[settings.cameraSize],
                    aspectRatio: '1 / 1',
                    borderRadius: CAMERA_RADIUS[settings.cameraShape],
                    [settings.cameraPosition.startsWith('top') ? 'top' : 'bottom']: '4%',
                    [settings.cameraPosition.endsWith('left') ? 'left' : 'right']: '3%',
                  }}
                >
                  <video ref={cameraRef} src={recording.camera.url} muted playsInline style={{ transform: 'scaleX(-1)' }} />
                </div>
              ) : null}
              {showCropOverlay ? (
                <CropTool
                  crop={crop ?? { x: 0, y: 0, width: 1, height: 1 }}
                  onPreview={(next) => setCrop(next, false)}
                  onCommit={(next) => setCrop(next, true)}
                />
              ) : null}
            </div>
          </div>

          <Timeline
            duration={duration}
            previewSrc={recording.screen.url}
            previewAspect={recording.width / recording.height}
            trimStart={edits.trimStart}
            trimEnd={edits.trimEnd}
            currentTime={currentTime}
            onPreview={previewEdits}
            onCommit={commitEdits}
            onSeek={seek}
          />

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={togglePlay}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={undo}>
              Undo
            </button>
            <button className="btn btn-sm btn-ghost" onClick={redo}>
              Redo
            </button>
            <span className="spacer" />
            <label className="meta" htmlFor="speed">
              Speed
            </label>
            <select
              id="speed"
              value={edits.speed}
              onChange={(event) => commitEdits({ speed: Number(event.target.value) })}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {value}x
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sidebar">
          <div className="tabs" role="tablist">
            {(['trim', 'crop', 'audio', 'export'] as Tab[]).map((value) => (
              <button
                key={value}
                role="tab"
                className="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'trim' ? (
            <div>
              <p className="note">Drag the handles on the timeline. Everything outside the selection is removed on export.</p>
              <div className="row" style={{ gap: 8, padding: '0 10px' }}>
                <button className="btn btn-sm" onClick={() => commitEdits({ trimStart: currentTime })}>
                  Start here
                </button>
                <button className="btn btn-sm" onClick={() => commitEdits({ trimEnd: currentTime })}>
                  End here
                </button>
              </div>
              <div className="row" style={{ gap: 8, padding: '8px 10px' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => commitEdits({ trimStart: 0, trimEnd: duration })}>
                  Reset trim
                </button>
                <span className="spacer" />
                <button className="btn btn-sm" onClick={() => setTab('export')}>
                  Download
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'crop' ? (
            <div>
              <div className="field">
                <label htmlFor="aspect">Aspect</label>
                <select
                  id="aspect"
                  onChange={(event) => {
                    const preset = ASPECTS[Number(event.target.value)]
                    setCrop(preset.value === null ? null : cropForAspect(preset.value, recording.width, recording.height), true)
                  }}
                >
                  {ASPECTS.map((preset, index) => (
                    <option key={preset.label} value={index}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="note">Drag the box over the preview.</p>
              <div style={{ padding: '0 10px' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setCrop(null, true)}>
                  Reset crop
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'audio' ? (
            <div>
              {recording.hasAudio ? (
                <>
                  <div className="field">
                    <label htmlFor="mute">Mute</label>
                    <input
                      id="mute"
                      type="checkbox"
                      checked={edits.muted}
                      onChange={(event) => commitEdits({ muted: event.target.checked })}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="volume">Volume</label>
                    <input
                      id="volume"
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={edits.volume}
                      disabled={edits.muted}
                      onChange={(event) => previewEdits({ volume: Number(event.target.value) })}
                      onPointerUp={() => commitEdits({ volume: edits.volume })}
                    />
                  </div>
                </>
              ) : (
                <p className="note">This recording has no audio track.</p>
              )}
            </div>
          ) : null}

          {tab === 'export' ? <ExportPanel recording={recording} edits={edits} /> : null}
        </div>
      </div>
    </div>
  )
}
