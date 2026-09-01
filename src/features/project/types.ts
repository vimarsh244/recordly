export interface CropRect {
  /** All values are fractions of the source frame, 0 to 1. */
  x: number
  y: number
  width: number
  height: number
}

export interface Edits {
  trimStart: number
  trimEnd: number
  crop: CropRect | null
  muted: boolean
  volume: number
  speed: number
}

export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'mp3' | 'wav'
export type ExportQuality = 'original' | 'high' | 'balanced' | 'small'
export type ExportResolution = 'original' | 2160 | 1440 | 1080 | 720 | 480

export interface ExportOptions {
  format: ExportFormat
  quality: ExportQuality
  resolution: ExportResolution
  frameRate?: number
}

export interface SourceInfo {
  width: number
  height: number
  durationSeconds: number
  hasAudio: boolean
  container: 'webm' | 'mp4'
}

export function defaultEdits(durationSeconds: number): Edits {
  return { trimStart: 0, trimEnd: durationSeconds, crop: null, muted: false, volume: 1, speed: 1 }
}

export function editsAreEmpty(edits: Edits, durationSeconds: number): boolean {
  return (
    edits.trimStart <= 0.01 &&
    edits.trimEnd >= durationSeconds - 0.01 &&
    edits.crop === null &&
    !edits.muted &&
    Math.abs(edits.volume - 1) < 0.001 &&
    Math.abs(edits.speed - 1) < 0.001
  )
}
