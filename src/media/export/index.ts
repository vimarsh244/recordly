import type { Edits, ExportOptions, SourceInfo } from '../../features/project/types'
import { preloadFfmpeg, runFfmpegExport } from '../ffmpeg/client'
import { canCopy, decideExport, type ExportEngine } from './plan'
import { ExportCancelled, type ExportHandle, type ExportProgress } from './types'
import { preloadWebCodecs, runFastExport, webCodecsAvailable } from './webcodecs'

export { ExportCancelled }
export type { ExportEngine, ExportHandle, ExportProgress }

/**
 * One entry point for every export. It picks the cheapest path that gives the
 * right file:
 *
 * 1. Save the original when the request changes nothing.
 * 2. Browser codecs, which run on hardware.
 * 3. FFmpeg in WebAssembly, which runs in software.
 *
 * If the browser accepts the fast path but then cannot handle the file, the
 * slow path takes over without the user having to press anything again.
 */

/**
 * Warms the engine the next export will most likely use. The browser codec
 * module is small, so it is always fetched. The WebAssembly build is about
 * thirty megabytes, so it is only fetched when it is going to be needed.
 */
export function preloadExport(needsFfmpeg = !webCodecsAvailable()): void {
  preloadWebCodecs()
  if (needsFfmpeg) preloadFfmpeg()
}

export interface StartExportOptions {
  input: Blob
  inputName: string
  edits: Edits
  options: ExportOptions
  source: SourceInfo
  onProgress: (progress: ExportProgress) => void
  /** Set by tests. Leave unset in the app. */
  allowFastPath?: boolean
}

export function planEngine(edits: Edits, options: ExportOptions, source: SourceInfo, fastPathUsable = webCodecsAvailable()): ExportEngine {
  if (canCopy(edits, options, source)) return 'copy'
  if (!fastPathUsable) return 'ffmpeg'
  return decideExport(edits, options, source).engine
}

export function runExport({
  input,
  inputName,
  edits,
  options,
  source,
  onProgress,
  allowFastPath = webCodecsAvailable(),
}: StartExportOptions): ExportHandle {
  let cancel: () => void = () => undefined
  let cancelled = false

  const result = (async (): Promise<Blob> => {
    const decision = decideExport(edits, options, source)

    if (allowFastPath && decision.engine === 'webcodecs' && decision.fast) {
      const handle = runFastExport(input, decision.fast, onProgress)
      cancel = () => void handle.cancel()
      try {
        return await handle.result
      } catch (error) {
        if (cancelled) throw new ExportCancelled()
        // The browser said it could do this and then could not. Fall through
        // to the software encoder rather than failing the export: FFmpeg reads
        // files that the browser decoders refuse. The warning is the only way
        // a user can tell us why their export took the slow road.
        console.warn('Recordly: browser codecs could not do this export.', error)
      }
    }

    if (cancelled) throw new ExportCancelled()
    const handle = runFfmpegExport(input, inputName, edits, options, source, onProgress)
    cancel = handle.cancel
    return handle.result
  })()

  return {
    result,
    cancel() {
      cancelled = true
      cancel()
    },
  }
}
