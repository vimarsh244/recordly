import { ColorHistogram, GifWriter, PaletteMapper } from '../gif/encoder'
import type { GifPlan } from './plan'
import { ExportCancelled, type ExportProgress } from './types'

/**
 * The fast GIF path.
 *
 * The browser decodes the video on its own hardware through Mediabunny, and
 * `../gif/encoder` writes the file. The old path did both jobs with FFmpeg in
 * WebAssembly, where a ten second clip could take minutes.
 *
 * The work runs in two passes over the frames, the same way the `palettegen`
 * and `paletteuse` filters of FFmpeg do:
 *
 * 1. A sample of frames builds one palette for the whole file.
 * 2. Every frame is mapped to that palette and written.
 *
 * One palette for the file, rather than one per frame, is what lets the writer
 * keep only the pixels that changed.
 */

type Mediabunny = typeof import('mediabunny')

let modulePromise: Promise<Mediabunny> | null = null

function mediabunny(): Promise<Mediabunny> {
  if (!modulePromise) {
    modulePromise = import('mediabunny')
    modulePromise.catch(() => {
      modulePromise = null
    })
  }
  return modulePromise
}

/** True when this browser can decode video with WebCodecs. */
export function videoDecodeAvailable(): boolean {
  return typeof VideoDecoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
}

export class GifPathUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GifPathUnavailable'
  }
}

export interface GifExportHandle {
  result: Promise<Blob>
  cancel(): void
}

/** Frames to read for the palette. More frames only change the palette a little. */
const PALETTE_FRAMES = 16
/** Pixels to read from each palette frame. */
const PALETTE_SAMPLES = 20_000

/** The source timestamps of every output frame, in seconds. */
export function frameTimestamps(plan: GifPlan): number[] {
  const span = Math.max(0, plan.trimEnd - plan.trimStart)
  const step = plan.speed / plan.frameRate
  const total = Math.max(1, Math.min(plan.estimatedFrames, Math.floor(span / step)))
  const stamps: number[] = []
  for (let index = 0; index < total; index++) stamps.push(plan.trimStart + index * step)
  return stamps
}

/** Evenly spread timestamps for the palette pass. */
export function paletteTimestamps(stamps: number[], wanted = PALETTE_FRAMES): number[] {
  if (stamps.length <= wanted) return stamps
  const step = stamps.length / wanted
  const picked: number[] = []
  for (let index = 0; index < wanted; index++) picked.push(stamps[Math.floor(index * step)])
  return picked
}

export function runGifExport(
  input: Blob,
  plan: GifPlan,
  onProgress: (progress: ExportProgress) => void,
): GifExportHandle {
  let cancelled = false
  const stop = () => {
    if (cancelled) throw new ExportCancelled()
  }

  const result = (async () => {
    const mb = await mediabunny()
    stop()
    onProgress({ engine: 'webcodecs', stage: 'preparing', ratio: null, processedSeconds: null })

    const source = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(input) })
    const track = await source.getPrimaryVideoTrack()
    if (!track) throw new GifPathUnavailable('The recording has no video track.')
    if (!(await track.canDecode())) throw new GifPathUnavailable('This browser cannot decode the recording.')

    const sink = new mb.CanvasSink(track, {
      width: plan.width,
      height: plan.height,
      fit: 'fill',
      crop: plan.crop ?? undefined,
      poolSize: 2,
    })

    const stamps = frameTimestamps(plan)
    const pixels = plan.width * plan.height
    const step = Math.max(1, Math.floor(pixels / PALETTE_SAMPLES))

    // Pass one: the palette.
    const histogram = new ColorHistogram()
    const paletteStamps = paletteTimestamps(stamps)
    let read = 0
    for await (const wrapped of sink.canvasesAtTimestamps(paletteStamps)) {
      stop()
      read++
      if (!wrapped) continue
      histogram.add(readPixels(wrapped.canvas, plan.width, plan.height), step)
      onProgress({
        engine: 'webcodecs',
        stage: 'preparing',
        ratio: (read / Math.max(1, paletteStamps.length)) * 0.15,
        processedSeconds: null,
      })
    }
    stop()
    if (histogram.empty) throw new GifPathUnavailable('No frames could be read.')

    // One slot of the 256 is kept for the transparent pixels the writer uses
    // for the parts of a frame that did not change.
    const palette = histogram.palette(plan.maxColors)
    const mapper = new PaletteMapper(palette)
    const writer = new GifWriter(plan.width, plan.height, { palette })
    const indexes = new Uint8Array(pixels)
    const delayCs = 100 / plan.frameRate

    // Pass two: the frames.
    let written = 0
    let carried = 0
    for await (const wrapped of sink.canvasesAtTimestamps(stamps)) {
      stop()
      written++
      if (!wrapped) {
        // No frame at this point in time. Hold the one before it for longer.
        carried += delayCs
        continue
      }
      mapper.map(readPixels(wrapped.canvas, plan.width, plan.height), indexes)
      writer.addFrame(indexes, delayCs + carried)
      carried = 0
      const ratio = 0.15 + (written / Math.max(1, stamps.length)) * 0.85
      onProgress({
        engine: 'webcodecs',
        stage: 'encoding',
        ratio: Math.min(1, ratio),
        processedSeconds: (written / plan.frameRate) * plan.speed,
      })
    }
    stop()
    if (written === 0) throw new GifPathUnavailable('No frames could be read.')

    onProgress({ engine: 'webcodecs', stage: 'finishing', ratio: 1, processedSeconds: null })
    const bytes = writer.finish()
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' })
  })()

  return {
    result,
    cancel() {
      cancelled = true
    },
  }
}

/** RGBA bytes of one decoded frame. */
function readPixels(canvas: HTMLCanvasElement | OffscreenCanvas, width: number, height: number): Uint8ClampedArray {
  const context = (canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null
  if (!context) throw new GifPathUnavailable('This browser gave no canvas to read.')
  return context.getImageData(0, 0, width, height).data
}
