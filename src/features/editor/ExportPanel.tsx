import { useEffect, useMemo, useRef, useState } from 'react'
import { formatBytes, formatDuration, safeFileName } from '../../lib/format'
import { ExportCancelled, planEngine, preloadExport, runExport, type ExportProgress } from '../../media/export'
import type { Recording } from '../../media/recording/types'
import { editsAreEmpty, type Edits, type ExportFormat, type ExportOptions, type ExportQuality, type ExportResolution } from '../project/types'
import { Progress } from '../../components/Progress'

interface Props {
  recording: Recording
  edits: Edits
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Words for the stage, so the panel never sits on one frozen label. */
function stageLabel(progress: ExportProgress | null, elapsedMs: number): string {
  if (!progress) return 'Starting'
  if (progress.stage === 'preparing') {
    return progress.engine === 'ffmpeg' && elapsedMs > 3000 ? 'Loading the encoder' : 'Preparing'
  }
  if (progress.stage === 'finishing') return 'Writing the file'
  if (progress.ratio === null) return 'Encoding'
  return `Encoding ${Math.round(progress.ratio * 100)}%`
}

/** Rough time left, from how far the export got in the time it has taken. */
function remainingLabel(progress: ExportProgress | null, elapsedMs: number): string | null {
  if (!progress || progress.ratio === null || progress.ratio <= 0.02 || elapsedMs < 1500) return null
  const total = elapsedMs / progress.ratio
  const left = total - elapsedMs
  if (left < 1000) return null
  return `about ${formatDuration(left)} left`
}

export function ExportPanel({ recording, edits }: Props) {
  const durationSeconds = recording.durationMs / 1000
  const [options, setOptions] = useState<ExportOptions>({ format: 'mp4', quality: 'high', resolution: 'original' })
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const selectionSeconds = Math.max(0, edits.trimEnd - edits.trimStart)
  const untouched = editsAreEmpty(edits, durationSeconds)
  const source = useMemo(
    () => ({
      width: recording.width,
      height: recording.height,
      durationSeconds,
      hasAudio: recording.hasAudio,
      container: recording.container,
    }),
    [recording.width, recording.height, durationSeconds, recording.hasAudio, recording.container],
  )

  const engine = useMemo(() => planEngine(edits, options, source), [edits, options, source])
  const canCopyOriginal = engine === 'copy' && untouched

  // Only fetch the thirty megabyte WebAssembly build once the chosen settings
  // actually need it. Most exports never do.
  useEffect(() => preloadExport(engine === 'ffmpeg'), [engine])

  // A clock the user can watch, so a slow export never looks frozen.
  useEffect(() => {
    if (!busy) return
    const startedAt = performance.now()
    setElapsedMs(0)
    const timer = setInterval(() => setElapsedMs(performance.now() - startedAt), 250)
    return () => clearInterval(timer)
  }, [busy])

  async function start() {
    setStatus(null)
    const fileName = `${safeFileName(recording.name)}.${options.format}`

    if (canCopyOriginal) {
      download(recording.screen.blob, fileName)
      setStatus(`Saved ${formatBytes(recording.screen.blob.size)}.`)
      return
    }

    setBusy(true)
    setProgress(null)
    const startedAt = performance.now()
    const handle = runExport({
      input: recording.screen.blob,
      inputName: `input.${recording.container}`,
      edits,
      options,
      source,
      onProgress: setProgress,
    })
    cancelRef.current = handle.cancel
    try {
      const blob = await handle.result
      download(blob, fileName)
      const took = formatDuration(performance.now() - startedAt)
      setStatus(`Saved ${formatBytes(blob.size)} in ${took}.`)
    } catch (error) {
      setStatus(
        error instanceof ExportCancelled
          ? 'Export cancelled. Your original recording is safe.'
          : 'Export failed. Your original recording is safe.',
      )
    } finally {
      cancelRef.current = null
      setBusy(false)
      setProgress(null)
    }
  }

  const heavyGif = options.format === 'gif' && selectionSeconds > 20
  const heavyFrame = recording.width * recording.height > 1920 * 1080 && options.resolution === 'original'
  const remaining = remainingLabel(progress, elapsedMs)

  return (
    <div className="panel" style={{ maxWidth: 'none' }}>
      <div className="panel-head">
        <span className="panel-title">Export</span>
      </div>

      <div className="field">
        <label htmlFor="export-format">Format</label>
        <select
          id="export-format"
          value={options.format}
          disabled={busy}
          onChange={(event) => setOptions({ ...options, format: event.target.value as ExportFormat })}
        >
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="gif">GIF</option>
          <option value="mp3">MP3 audio</option>
          <option value="wav">WAV audio</option>
        </select>
      </div>

      {options.format !== 'gif' ? (
        <div className="field">
          <label htmlFor="export-quality">Quality</label>
          <select
            id="export-quality"
            value={options.quality}
            disabled={busy}
            onChange={(event) => setOptions({ ...options, quality: event.target.value as ExportQuality })}
          >
            <option value="high">High</option>
            <option value="balanced">Balanced</option>
            <option value="small">Small file</option>
          </select>
        </div>
      ) : null}

      {options.format === 'mp4' || options.format === 'webm' || options.format === 'gif' ? (
        <div className="field">
          <label htmlFor="export-resolution">Size</label>
          <select
            id="export-resolution"
            value={String(options.resolution)}
            disabled={busy}
            onChange={(event) =>
              setOptions({
                ...options,
                resolution: (event.target.value === 'original'
                  ? 'original'
                  : Number(event.target.value)) as ExportResolution,
              })
            }
          >
            <option value="original">Original</option>
            <option value="1440">1440p</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
          </select>
        </div>
      ) : null}

      {busy ? (
        <div style={{ padding: '8px 10px' }}>
          <Progress ratio={progress?.ratio ?? null} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <span className="meta">{stageLabel(progress, elapsedMs)}</span>
            <span className="spacer" />
            <button className="btn btn-sm" onClick={() => cancelRef.current?.()}>
              Cancel
            </button>
          </div>
          <p className="note">
            {formatDuration(elapsedMs)} so far
            {remaining ? `, ${remaining}` : ''}
            {progress?.engine === 'ffmpeg' ? '. Software encoding, so this takes a while.' : ''}
          </p>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => void start()}>
          Export and download
        </button>
      )}

      <div className="row" style={{ gap: 8, padding: '10px 10px 0' }}>
        <button
          className="btn btn-sm btn-ghost"
          disabled={busy}
          onClick={() => download(recording.screen.blob, `${safeFileName(recording.name)}.${recording.container}`)}
        >
          Download original
        </button>
        <span className="meta">{formatBytes(recording.bytes)}</span>
      </div>
      <p className="note">The original is the untouched recording. Your trim, crop and audio edits are not in it.</p>

      {status ? <p className="note">{status}</p> : null}
      {heavyGif ? <p className="note">Long GIFs get large. Trim the selection or pick a smaller size.</p> : null}
      {!busy && engine === 'ffmpeg' && heavyFrame ? (
        <p className="note">Software encoding at this frame size is slow and uses a lot of memory. Try 1080p.</p>
      ) : null}
      {!busy && engine === 'ffmpeg' ? (
        <p className="note">
          These settings need software encoding, which is slow. MP4 or WebM without a speed change uses your
          hardware instead.
        </p>
      ) : null}
      {canCopyOriginal ? <p className="note">No edits to apply, so the original file is saved directly.</p> : null}
    </div>
  )
}
