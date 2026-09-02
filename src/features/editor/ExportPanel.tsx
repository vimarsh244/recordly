import { useRef, useState } from 'react'
import { formatBytes, safeFileName } from '../../lib/format'
import { ExportCancelled, runExport } from '../../media/ffmpeg/client'
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

export function ExportPanel({ recording, edits }: Props) {
  const durationSeconds = recording.durationMs / 1000
  const [options, setOptions] = useState<ExportOptions>({ format: 'mp4', quality: 'high', resolution: 'original' })
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const selectionSeconds = Math.max(0, edits.trimEnd - edits.trimStart)
  const untouched = editsAreEmpty(edits, durationSeconds)
  const canCopyOriginal =
    untouched && options.format === recording.container && options.quality === 'high' && options.resolution === 'original'

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
    const handle = runExport(
      recording.screen.blob,
      `input.${recording.container}`,
      edits,
      options,
      {
        width: recording.width,
        height: recording.height,
        durationSeconds,
        hasAudio: recording.hasAudio,
        container: recording.container,
      },
      setProgress,
    )
    cancelRef.current = handle.cancel
    try {
      const blob = await handle.result
      download(blob, fileName)
      setStatus(`Saved ${formatBytes(blob.size)}.`)
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
  const large = recording.width * recording.height > 1920 * 1080 && options.resolution === 'original'

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
          <Progress ratio={progress} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <span className="meta">{progress === null ? 'Preparing export' : `Exporting ${Math.round(progress * 100)}%`}</span>
            <span className="spacer" />
            <button className="btn btn-sm" onClick={() => cancelRef.current?.()}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => void start()}>
          Export
        </button>
      )}

      {status ? <p className="note">{status}</p> : null}
      {heavyGif ? <p className="note">Long GIFs get large. Trim the selection or pick a smaller size.</p> : null}
      {large ? <p className="note">This export may use significant memory. Try 1080p for faster processing.</p> : null}
      {canCopyOriginal ? <p className="note">No edits to apply, so the original file is saved directly.</p> : null}
    </div>
  )
}
