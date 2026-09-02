import singleCoreUrl from '@ffmpeg/core?url'
import singleWasmUrl from '@ffmpeg/core/wasm?url'
import mtCoreUrl from '@ffmpeg/core-mt?url'
import mtWasmUrl from '@ffmpeg/core-mt/wasm?url'
import mtWorkerUrl from '@ffmpeg/core-mt/worker?url'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import type { Edits, ExportOptions, SourceInfo } from '../../features/project/types'
import type { ExportProgress } from '../export/types'
import { ExportCancelled } from '../export/types'
import { mimeTypeFor, planExport } from './args'

/**
 * The fallback export path: FFmpeg built to WebAssembly. It is correct on every
 * browser but it encodes in software, so it is slow. Two things keep it as
 * quick as it can be:
 *
 * 1. The multi threaded build is used whenever the page is cross origin
 *    isolated, which is what `public/coi-serviceworker.js` arranges. That build
 *    needs SharedArrayBuffer and gives roughly one thread per core.
 * 2. Progress is read from the encoder log, not from the container header.
 *    A file from MediaRecorder carries no duration, so the built in progress
 *    callback reports nothing and the interface used to sit on "Preparing".
 */

export interface FfmpegRuntime {
  ffmpeg: FFmpeg
  threads: number
  multiThreaded: boolean
}

let instance: FfmpegRuntime | null = null
let loading: Promise<FfmpegRuntime> | null = null

/** True when the page may use SharedArrayBuffer, so the fast build can run. */
export function canUseThreads(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof crossOriginIsolated !== 'undefined' &&
    crossOriginIsolated === true
  )
}

/** Threads the multi threaded build should use. */
export function threadCount(): number {
  if (!canUseThreads()) return 1
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  // Leaving one core free keeps the interface responsive during an export.
  return Math.max(2, Math.min(8, cores - 1))
}

export function ffmpegLoaded(): boolean {
  return instance !== null
}

export async function loadFfmpeg(): Promise<FfmpegRuntime> {
  if (instance) return instance
  if (!loading) {
    loading = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const ffmpeg = new FFmpeg()
      const multiThreaded = canUseThreads()
      const absolute = (url: string) => new URL(url, self.location.href).href
      await ffmpeg.load(
        multiThreaded
          ? {
              coreURL: absolute(mtCoreUrl),
              wasmURL: absolute(mtWasmUrl),
              workerURL: absolute(mtWorkerUrl),
            }
          : { coreURL: absolute(singleCoreUrl), wasmURL: absolute(singleWasmUrl) },
      )
      const runtime: FfmpegRuntime = { ffmpeg, multiThreaded, threads: multiThreaded ? threadCount() : 1 }
      instance = runtime
      return runtime
    })()
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}

/** Warms ffmpeg up while the user is doing something else. Failures are fine. */
export function preloadFfmpeg(): void {
  const idle = (self as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  const start = () => void loadFfmpeg().catch(() => undefined)
  if (idle) idle(start)
  else setTimeout(start, 2000)
}

export { ExportCancelled }

export interface FfmpegExportHandle {
  result: Promise<Blob>
  cancel(): void
}

const TIME_PATTERN = /time=\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/

/** Reads `time=00:00:03.45` out of an encoder log line, in seconds. */
export function parseLogTime(message: string): number | null {
  const match = TIME_PATTERN.exec(message)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  return hours * 3600 + minutes * 60 + seconds
}

export function runFfmpegExport(
  input: Blob,
  inputName: string,
  edits: Edits,
  options: ExportOptions,
  source: SourceInfo,
  onProgress: (progress: ExportProgress) => void,
): FfmpegExportHandle {
  let cancelled = false
  let active: FfmpegRuntime | null = null

  const result = (async () => {
    onProgress({ engine: 'ffmpeg', stage: 'preparing', ratio: null, processedSeconds: null })
    const runtime = await loadFfmpeg()
    active = runtime
    if (cancelled) throw new ExportCancelled()

    const { ffmpeg } = runtime
    const plan = planExport(inputName, edits, options, source, { threads: runtime.threads })

    // The log carries a real clock. The header of a MediaRecorder file does
    // not, so this is the only progress the user can trust.
    const onLog = ({ message }: { message: string }) => {
      const seconds = parseLogTime(message)
      if (seconds === null) return
      const ratio = plan.outputSeconds > 0 ? Math.min(1, seconds / plan.outputSeconds) : null
      onProgress({ engine: 'ffmpeg', stage: 'encoding', ratio, processedSeconds: seconds })
    }
    const onNativeProgress = ({ progress }: { progress: number }) => {
      if (!Number.isFinite(progress) || progress <= 0) return
      onProgress({ engine: 'ffmpeg', stage: 'encoding', ratio: Math.min(1, progress), processedSeconds: null })
    }
    ffmpeg.on('log', onLog)
    ffmpeg.on('progress', onNativeProgress)

    try {
      await ffmpeg.writeFile(inputName, new Uint8Array(await input.arrayBuffer()))
      if (cancelled) throw new ExportCancelled()
      const code = await ffmpeg.exec(plan.args)
      if (cancelled) throw new ExportCancelled()
      if (code !== 0) throw new Error('Export failed.')
      onProgress({ engine: 'ffmpeg', stage: 'finishing', ratio: 1, processedSeconds: null })
      const data = await ffmpeg.readFile(plan.outputName)
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeTypeFor(options.format) })
    } finally {
      ffmpeg.off('log', onLog)
      ffmpeg.off('progress', onNativeProgress)
      // Free the virtual file system, whatever the outcome.
      await ffmpeg.deleteFile(inputName).catch(() => undefined)
      await ffmpeg.deleteFile(plan.outputName).catch(() => undefined)
    }
  })()

  return {
    result,
    cancel() {
      cancelled = true
      // Terminating is the only way to interrupt a running encode. The next
      // export loads a fresh instance.
      active?.ffmpeg.terminate()
      if (active === instance) {
        instance = null
        loading = null
      }
    },
  }
}
