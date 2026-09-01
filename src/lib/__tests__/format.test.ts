import { describe, expect, it } from 'vitest'
import { clamp, formatBytes, formatDuration, formatTimecode, safeFileName } from '../format'
import { videoBitrate } from '../../media/recording/quality'

describe('format helpers', () => {
  it('formats durations with hours only when needed', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65_000)).toBe('01:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })

  it('formats a timecode with hundredths', () => {
    expect(formatTimecode(5.25)).toBe('00:05.25')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('removes characters that break file names', () => {
    expect(safeFileName('demo/two:parts?')).toBe('demo two parts')
    expect(safeFileName('   ')).toBe('recording')
  })

  it('clamps values', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
  })
})

describe('videoBitrate', () => {
  it('scales with pixels and stays inside sane limits', () => {
    expect(videoBitrate(1920, 1080, 30, 'high')).toBeGreaterThan(videoBitrate(1280, 720, 30, 'high'))
    expect(videoBitrate(1920, 1080, 30, 'small')).toBeLessThan(videoBitrate(1920, 1080, 30, 'balanced'))
    expect(videoBitrate(320, 240, 15, 'small')).toBe(800_000)
    expect(videoBitrate(7680, 4320, 60, 'high')).toBe(40_000_000)
  })
})
