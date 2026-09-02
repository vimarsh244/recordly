import coreUrl from '@ffmpeg/core?url'
import wasmUrl from '@ffmpeg/core/wasm?url'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import type { Edits, ExportOptions, SourceInfo } from '../../features/project/types'
import { mimeTypeFor, planExport } from './args'

/**
 * Thin client for ffmpeg.wasm. The library runs the encoder in its own worker,
 * so the interface stays responsive during an export. The whole module is
 * loaded on demand: opening Recordly must never wait for a WebAssembly build.
 */

let instance: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

export function ffmpegLoaded(): boolean {
  return instance !== null
}

export async function loadFfmpeg(): Promise<FFmpeg> {
  if (instance) return instance
  if (!loading) {
    loading = (async () => {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: new URL(coreUrl, self.location.href).href,
        wasmURL: new URL(wasmUrl, self.location.href).href,
      })
      instance = ffmpeg
      return ffmpeg
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

export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled.')
    this.name = 'ExportCancelled'
  }
}

export interface ExportHandle {
  result: Promise<Blob>
  cancel(): void
}

export function runExport(
  input: Blob,
  inputName: string,
  edits: Edits,
  options: ExportOptions,
  source: SourceInfo,
  onProgress: (ratio: number | null) => void,
): ExportHandle {
  let cancelled = false
  let active: FFmpeg | null = null

  const result = (async () => {
    const ffmpeg = await loadFfmpeg()
    active = ffmpeg
    if (cancelled) throw new ExportCancelled()

    const plan = planExport(inputName, edits, options, source)
    const progress = ({ progress }: { progress: number }) => {
      onProgress(Number.isFinite(progress) && progress > 0 ? Math.min(1, progress) : null)
    }
    ffmpeg.on('progress', progress)
    try {
      await ffmpeg.writeFile(inputName, new Uint8Array(await input.arrayBuffer()))
      if (cancelled) throw new ExportCancelled()
      const code = await ffmpeg.exec(plan.args)
      if (cancelled) throw new ExportCancelled()
      if (code !== 0) throw new Error('Export failed.')
      const data = await ffmpeg.readFile(plan.outputName)
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
      return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeTypeFor(options.format) })
    } finally {
      ffmpeg.off('progress', progress)
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
      active?.terminate()
      if (active === instance) {
        instance = null
        loading = null
      }
    },
  }
}
