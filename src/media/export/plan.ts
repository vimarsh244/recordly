import type { Edits, ExportOptions, ExportQuality, SourceInfo } from '../../features/project/types'

/**
 * Which engine does the work.
 *
 * - `copy`   The file already matches the request, so it is saved as it is.
 * - `webcodecs` The browser codecs do the work. They use the graphics or media
 *   hardware, so this is the fast path.
 * - `ffmpeg` WebAssembly software encoding. Correct everywhere, but slow.
 */
export type ExportEngine = 'copy' | 'webcodecs' | 'ffmpeg'

export type QualityLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high'

/** Even numbers only. Most encoders reject odd dimensions. */
export function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2)
}

const QUALITY_LEVEL: Record<ExportQuality, QualityLevel> = {
  original: 'very-high',
  high: 'high',
  balanced: 'medium',
  small: 'low',
}

export interface FastPlan {
  /** Container to write. */
  container: 'mp4' | 'webm' | 'wav'
  /** Video codecs to try, best first. Empty when the output has no video. */
  videoCodecs: ('avc' | 'vp9' | 'vp8' | 'av1')[]
  /** Audio codecs to try, best first. Empty when the output has no audio. */
  audioCodecs: ('aac' | 'opus' | 'pcm-s16')[]
  /** Crop box in source pixels, or null for the whole frame. */
  crop: { left: number; top: number; width: number; height: number } | null
  /** Target height in pixels, or null to keep the source height. */
  height: number | null
  frameRate: number | null
  trimStart: number
  trimEnd: number
  /** Playback rate. 1 means no change. */
  speed: number
  /** Linear gain. 1 means no change. */
  volume: number
  quality: QualityLevel
  /** Frames the encoder has to produce. Used for the progress readout. */
  estimatedFrames: number
}

/**
 * A GIF export. No browser encodes GIF, but every browser decodes the video,
 * and the writer in `../gif/encoder` does the rest. That is far quicker than
 * doing both jobs in software.
 */
export interface GifPlan {
  /** Crop box in source pixels, or null for the whole frame. */
  crop: { left: number; top: number; width: number; height: number } | null
  width: number
  height: number
  frameRate: number
  trimStart: number
  trimEnd: number
  /** Playback rate. 1 means no change. */
  speed: number
  /** Colours in the palette. One more slot is kept for transparency. */
  maxColors: number
  /** Frames the writer has to produce. Used for the progress readout. */
  estimatedFrames: number
}

export interface ExportDecision {
  engine: Exclude<ExportEngine, 'copy'>
  /** Present when the engine is `webcodecs` and the output is not a GIF. */
  fast: FastPlan | null
  /** Present when the engine is `webcodecs` and the output is a GIF. */
  gif: GifPlan | null
  /** Why the slow engine was picked. Shown to the user and used in tests. */
  reason: string
}

/** Frames a second for a GIF when the user picked no rate. */
const GIF_FRAME_RATE = 12
/** Height of a GIF when the user kept the original size. */
const GIF_HEIGHT = 480

/** True when the request changes nothing about the file. */
export function canCopy(edits: Edits, options: ExportOptions, source: SourceInfo): boolean {
  return (
    options.format === source.container &&
    (options.quality === 'original' || options.quality === 'high') &&
    options.resolution === 'original' &&
    !options.frameRate &&
    edits.crop === null &&
    Math.abs(edits.speed - 1) < 0.001 &&
    Math.abs(edits.volume - 1) < 0.001 &&
    !edits.muted &&
    edits.trimStart <= 0.01 &&
    edits.trimEnd >= source.durationSeconds - 0.01
  )
}

/**
 * Picks the engine for one export and, for the fast engine, the whole plan.
 *
 * Pure on purpose: the choice is the part that decides whether an export takes
 * two seconds or two minutes, so it is tested without loading any codec.
 */
export function decideExport(edits: Edits, options: ExportOptions, source: SourceInfo): ExportDecision {
  const speed = Math.min(2, Math.max(0.5, edits.speed))
  const wantsAudio = source.hasAudio && !edits.muted
  const slow = (reason: string): ExportDecision => ({ engine: 'ffmpeg', fast: null, gif: null, reason })

  // MP3 needs an encoder no browser exposes.
  if (options.format === 'mp3') return slow('MP3 needs the WebAssembly encoder.')

  // Changing the rate of audio without changing its pitch is a filter, not a
  // codec feature. Video on its own only needs new timestamps, so that is fine.
  // A GIF carries no audio, so a speed change there is only new timestamps.
  if (Math.abs(speed - 1) > 0.001 && wantsAudio && options.format !== 'wav' && options.format !== 'gif') {
    return slow('Speed changes with audio need the WebAssembly encoder.')
  }
  if (options.format === 'wav' && Math.abs(speed - 1) > 0.001) {
    return slow('Speed changes with audio need the WebAssembly encoder.')
  }

  const start = Math.max(0, edits.trimStart)
  const end = Math.min(source.durationSeconds, edits.trimEnd)
  const outputSeconds = Math.max(0.05, (end - start) / speed)

  let crop: FastPlan['crop'] = null
  let cropHeight = source.height
  if (edits.crop) {
    crop = {
      left: Math.round(source.width * edits.crop.x),
      top: Math.round(source.height * edits.crop.y),
      width: even(source.width * edits.crop.width),
      height: even(source.height * edits.crop.height),
    }
    cropHeight = crop.height
  }

  const height = options.resolution === 'original' ? null : even(Math.min(options.resolution, cropHeight))
  const frameRate = options.frameRate ?? null

  if (options.format === 'gif') {
    const cropWidth = crop ? crop.width : source.width
    // A GIF at the full size of a screen recording is enormous, so the
    // original size means 480 lines, which is what the old path also did.
    const gifHeight = Math.max(2, Math.min(height ?? GIF_HEIGHT, cropHeight))
    const gifWidth = Math.max(2, Math.round((cropWidth * gifHeight) / cropHeight))
    const gifRate = frameRate ?? GIF_FRAME_RATE
    return {
      engine: 'webcodecs',
      reason: 'Browser decoder with the built in GIF writer.',
      fast: null,
      gif: {
        crop,
        width: gifWidth,
        height: gifHeight,
        frameRate: gifRate,
        trimStart: start,
        trimEnd: end,
        speed,
        maxColors: 255,
        estimatedFrames: Math.max(1, Math.ceil(outputSeconds * gifRate)),
      },
    }
  }
  const audioOnly = options.format === 'wav'
  // An audio only file with no audio track is not a file. Let the slow path
  // report the failure, the way it always has.
  if (audioOnly && !wantsAudio) return slow('There is no audio to write.')

  return {
    engine: 'webcodecs',
    reason: 'Browser codecs.',
    gif: null,
    fast: {
      container: options.format === 'mp4' ? 'mp4' : options.format === 'webm' ? 'webm' : 'wav',
      videoCodecs: audioOnly ? [] : options.format === 'mp4' ? ['avc'] : ['vp9', 'vp8', 'av1'],
      // MP4 keeps to AAC. Opus in an MP4 is legal but many players refuse it,
      // and a file the user cannot open is not a fast export.
      audioCodecs: !wantsAudio ? [] : audioOnly ? ['pcm-s16'] : options.format === 'mp4' ? ['aac'] : ['opus'],
      crop,
      height,
      frameRate,
      trimStart: start,
      trimEnd: end,
      speed,
      volume: Math.max(0, edits.volume),
      quality: QUALITY_LEVEL[options.quality],
      estimatedFrames: Math.max(1, Math.round(outputSeconds * (frameRate ?? 30))),
    },
  }
}
