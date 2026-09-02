import type { Edits, ExportOptions, ExportQuality, SourceInfo } from '../../features/project/types'

const X264_CRF: Record<Exclude<ExportQuality, 'original'>, number> = { high: 20, balanced: 25, small: 31 }
const VP9_CRF: Record<Exclude<ExportQuality, 'original'>, number> = { high: 28, balanced: 34, small: 40 }

function crf(table: Record<Exclude<ExportQuality, 'original'>, number>, quality: ExportQuality): number {
  return quality === 'original' ? table.high : table[quality]
}

/** Even numbers only. Most encoders reject odd dimensions. */
function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2)
}

export interface PlannedExport {
  args: string[]
  outputName: string
  /** True when the source is copied without re-encoding. */
  streamCopy: boolean
  /** Length of the output in seconds. Used to turn log lines into progress. */
  outputSeconds: number
}

export interface PlanRuntime {
  /**
   * Worker threads the encoder may use. One means the single threaded build.
   * The multi threaded build only runs when the page is cross origin isolated.
   */
  threads?: number
}

/**
 * Turns edit state plus export options into an ffmpeg command. Pure on
 * purpose: the interesting logic is testable without loading WebAssembly.
 */
export function planExport(
  inputName: string,
  edits: Edits,
  options: ExportOptions,
  source: SourceInfo,
  runtime: PlanRuntime = {},
): PlannedExport {
  const outputName = `output.${options.format}`
  const start = Math.max(0, edits.trimStart)
  const end = Math.min(source.durationSeconds, edits.trimEnd)
  const duration = Math.max(0.05, end - start)
  const trimmed = start > 0.01 || end < source.durationSeconds - 0.01

  const audioOnly = options.format === 'mp3' || options.format === 'wav'
  const wantsAudio = source.hasAudio && !edits.muted
  const speed = Math.min(2, Math.max(0.5, edits.speed))

  const input: string[] = ['-nostdin', '-y']
  if (start > 0.01) input.push('-ss', start.toFixed(3))
  input.push('-i', inputName)
  if (trimmed) input.push('-t', duration.toFixed(3))

  // Nothing to change and the container already matches: copy the streams.
  const canCopy =
    !audioOnly &&
    options.format === source.container &&
    options.quality === 'original' &&
    options.resolution === 'original' &&
    edits.crop === null &&
    speed === 1 &&
    Math.abs(edits.volume - 1) < 0.001 &&
    !edits.muted
  if (canCopy) {
    return { args: [...input, '-c', 'copy', outputName], streamCopy: true, outputName, outputSeconds: duration }
  }

  // Software encoding is the slowest thing Recordly does, so give it every
  // core the browser admits to. One thread means the single threaded build,
  // where the flag would only add overhead.
  const threads = Math.max(1, Math.min(16, Math.floor(runtime.threads ?? 1)))
  const threadArgs = threads > 1 ? ['-threads', String(threads)] : []
  const outputSeconds = duration / speed

  const videoFilters: string[] = []
  if (edits.crop) {
    const width = even(source.width * edits.crop.width)
    const height = even(source.height * edits.crop.height)
    const x = Math.round(source.width * edits.crop.x)
    const y = Math.round(source.height * edits.crop.y)
    videoFilters.push(`crop=${width}:${height}:${x}:${y}`)
  }
  if (options.resolution !== 'original') {
    videoFilters.push(`scale=-2:${options.resolution}:force_original_aspect_ratio=decrease`)
  }
  if (speed !== 1) videoFilters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`)
  if (options.frameRate) videoFilters.push(`fps=${options.frameRate}`)

  const audioFilters: string[] = []
  if (speed !== 1) audioFilters.push(`atempo=${speed.toFixed(4)}`)
  if (Math.abs(edits.volume - 1) > 0.001) audioFilters.push(`volume=${edits.volume.toFixed(3)}`)

  if (audioOnly) {
    const args = [...input, '-vn']
    if (audioFilters.length > 0) args.push('-af', audioFilters.join(','))
    if (options.format === 'wav') args.push('-c:a', 'pcm_s16le')
    else args.push('-c:a', 'libmp3lame', '-q:a', options.quality === 'small' ? '5' : '2')
    args.push(outputName)
    return { args, streamCopy: false, outputName, outputSeconds }
  }

  if (options.format === 'gif') {
    const gifFilters = [...videoFilters]
    if (!options.frameRate) gifFilters.push('fps=12')
    if (options.resolution === 'original') gifFilters.push('scale=-2:480:flags=lanczos')
    const chain = `${gifFilters.join(',')},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer`
    return {
      args: [...input, '-an', ...threadArgs, '-filter_complex', chain, '-loop', '0', outputName],
      streamCopy: false,
      outputName,
      outputSeconds,
    }
  }

  const args = [...input, ...threadArgs]
  if (videoFilters.length > 0) args.push('-vf', videoFilters.join(','))

  if (options.format === 'mp4') {
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf(X264_CRF, options.quality)), '-pix_fmt', 'yuv420p')
  } else {
    args.push(
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      String(crf(VP9_CRF, options.quality)),
      '-row-mt',
      '1',
      '-tile-columns',
      threads > 4 ? '2' : '1',
      '-deadline',
      'realtime',
      '-cpu-used',
      '5',
    )
  }

  if (!wantsAudio) {
    args.push('-an')
  } else {
    if (audioFilters.length > 0) args.push('-af', audioFilters.join(','))
    if (options.format === 'mp4') args.push('-c:a', 'aac', '-b:a', '128k')
    else args.push('-c:a', 'libopus', '-b:a', '128k')
  }

  if (options.format === 'mp4') args.push('-movflags', '+faststart')
  args.push(outputName)
  return { args, streamCopy: false, outputName, outputSeconds }
}

export function mimeTypeFor(format: ExportOptions['format']): string {
  switch (format) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'gif':
      return 'image/gif'
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
  }
}
