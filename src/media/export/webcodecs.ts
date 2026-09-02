import type { FastPlan } from './plan'
import type { ExportProgress } from './types'

/**
 * The fast export path. It uses the browser's own encoders and decoders
 * through Mediabunny, so the graphics or media hardware does the work instead
 * of a software encoder in WebAssembly. On a typical machine this is between
 * ten and fifty times faster than the WebAssembly path, and it uses far less
 * memory because frames never pass through a virtual file system.
 *
 * Mediabunny is loaded on demand. Opening Recordly must never wait for it.
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

/** Warms the module up while the user is doing something else. */
export function preloadWebCodecs(): void {
  void mediabunny().catch(() => undefined)
}

export class FastPathUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FastPathUnavailable'
  }
}

/** True when this browser exposes the encoder side of WebCodecs. */
export function webCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined'
}

export interface FastExportHandle {
  result: Promise<Blob>
  cancel(): Promise<void>
}

function mimeTypeFor(container: FastPlan['container']): string {
  if (container === 'mp4') return 'video/mp4'
  if (container === 'webm') return 'video/webm'
  return 'audio/wav'
}

export function runFastExport(
  input: Blob,
  plan: FastPlan,
  onProgress: (progress: ExportProgress) => void,
): FastExportHandle {
  let cancelled = false
  let cancelConversion: (() => Promise<void>) | null = null

  const result = (async () => {
    const mb = await mediabunny()
    if (cancelled) throw new mb.ConversionCanceledError()

    onProgress({ engine: 'webcodecs', stage: 'preparing', ratio: null, processedSeconds: null })

    const source = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(input) })
    const target = new mb.BufferTarget()
    const format =
      plan.container === 'mp4'
        ? new mb.Mp4OutputFormat({ fastStart: 'in-memory' })
        : plan.container === 'webm'
          ? new mb.WebMOutputFormat()
          : new mb.WavOutputFormat()
    const output = new mb.Output({ format, target })

    const quality = new mb.Quality(plan.quality)

    // Pick codecs the browser can really encode. Asking for one it cannot do
    // would make the conversion silently drop the track.
    const videoCodec = plan.videoCodecs.length
      ? await mb.getFirstEncodableVideoCodec(plan.videoCodecs.slice(), { height: plan.height ?? undefined, quality })
      : null
    if (plan.videoCodecs.length > 0 && !videoCodec) {
      throw new FastPathUnavailable('No hardware video encoder for this format.')
    }
    const audioCodec = plan.audioCodecs.length
      ? await mb.getFirstEncodableAudioCodec(plan.audioCodecs.slice(), { quality })
      : null
    if (plan.audioCodecs.length > 0 && !audioCodec) {
      throw new FastPathUnavailable('No audio encoder for this format.')
    }

    const rate = plan.speed
    const gain = plan.volume

    const conversion = await mb.Conversion.init({
      input: source,
      output,
      trim: { start: plan.trimStart, end: plan.trimEnd },
      showWarnings: false,
      video:
        plan.videoCodecs.length === 0
          ? { discard: true }
          : {
              codec: videoCodec ?? undefined,
              quality,
              crop: plan.crop ?? undefined,
              height: plan.height ?? undefined,
              frameRate: plan.frameRate ?? undefined,
              // Speed is only a change of timestamps. The frames themselves
              // are untouched, so this costs nothing.
              process:
                Math.abs(rate - 1) < 0.001
                  ? undefined
                  : (sample) => {
                      sample.setTimestamp(sample.timestamp / rate)
                      sample.setDuration(sample.duration / rate)
                      return sample
                    },
            },
      audio:
        plan.audioCodecs.length === 0
          ? { discard: true }
          : {
              codec: audioCodec ?? undefined,
              quality,
              process:
                Math.abs(gain - 1) < 0.001 ? undefined : (sample) => scaleGain(mb, sample, gain),
            },
    })

    if (!conversion.isValid) {
      const reason = conversion.discardedTracks.map((track) => track.reason).join(', ')
      throw new FastPathUnavailable(`Browser codecs cannot handle this file (${reason || 'unknown'}).`)
    }
    // A dropped video track would quietly produce an audio-only file.
    if (plan.videoCodecs.length > 0 && !conversion.utilizedTracks.some((track) => track.type === 'video')) {
      throw new FastPathUnavailable('Browser codecs cannot read the video track.')
    }

    conversion.onProgress = (ratio, processedTime) => {
      onProgress({
        engine: 'webcodecs',
        stage: 'encoding',
        ratio: Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : null,
        processedSeconds: Number.isFinite(processedTime) ? processedTime : null,
      })
    }
    cancelConversion = () => conversion.cancel()

    if (cancelled) {
      await conversion.cancel()
      throw new mb.ConversionCanceledError()
    }

    await conversion.execute()
    onProgress({ engine: 'webcodecs', stage: 'finishing', ratio: 1, processedSeconds: null })

    const buffer = target.buffer
    if (!buffer) throw new FastPathUnavailable('The encoder produced no data.')
    return new Blob([buffer], { type: mimeTypeFor(plan.container) })
  })()

  return {
    result,
    async cancel() {
      cancelled = true
      await cancelConversion?.().catch(() => undefined)
    },
  }
}

/** Multiplies one audio sample by a linear gain, in place of a filter graph. */
function scaleGain(mb: Mediabunny, sample: import('mediabunny').AudioSample, gain: number) {
  const frames = new Float32Array(sample.numberOfFrames * sample.numberOfChannels)
  sample.copyTo(frames, { planeIndex: 0, format: 'f32' })
  for (let i = 0; i < frames.length; i += 1) {
    const value = frames[i] * gain
    frames[i] = value > 1 ? 1 : value < -1 ? -1 : value
  }
  const scaled = new mb.AudioSample({
    data: frames,
    format: 'f32',
    numberOfChannels: sample.numberOfChannels,
    sampleRate: sample.sampleRate,
    timestamp: sample.timestamp,
  })
  sample.close()
  return scaled
}
