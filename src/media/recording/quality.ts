export type QualityLevel = 'high' | 'balanced' | 'small'

const BITS_PER_PIXEL: Record<QualityLevel, number> = {
  high: 0.15,
  balanced: 0.08,
  small: 0.04,
}

/** Video bitrate for a capture, kept inside limits browsers handle well. */
export function videoBitrate(width: number, height: number, frameRate: number, quality: QualityLevel): number {
  const pixels = Math.max(1, width * height)
  const raw = pixels * Math.max(1, frameRate) * BITS_PER_PIXEL[quality]
  return Math.round(Math.min(Math.max(raw, 800_000), 40_000_000))
}

export function audioBitrate(quality: QualityLevel): number {
  return quality === 'small' ? 96_000 : 128_000
}
