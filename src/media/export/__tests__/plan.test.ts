import { describe, expect, it } from 'vitest'
import { canCopy, decideExport } from '../plan'
import { defaultEdits, type ExportOptions, type SourceInfo } from '../../../features/project/types'

const source: SourceInfo = { width: 2560, height: 1440, durationSeconds: 60, hasAudio: true, container: 'webm' }
const options: ExportOptions = { format: 'mp4', quality: 'high', resolution: 'original' }

describe('canCopy', () => {
  it('copies when the container matches and nothing changed', () => {
    expect(canCopy(defaultEdits(60), { ...options, format: 'webm' }, source)).toBe(true)
  })

  it('does not copy when the container changes', () => {
    expect(canCopy(defaultEdits(60), options, source)).toBe(false)
  })

  it('does not copy a trimmed selection', () => {
    const edits = { ...defaultEdits(60), trimEnd: 30 }
    expect(canCopy(edits, { ...options, format: 'webm' }, source)).toBe(false)
  })
})

describe('decideExport', () => {
  it('uses the browser codecs for a plain re-encode', () => {
    const decision = decideExport(defaultEdits(60), options, source)
    expect(decision.engine).toBe('webcodecs')
    expect(decision.fast?.container).toBe('mp4')
    expect(decision.fast?.videoCodecs).toEqual(['avc'])
    expect(decision.fast?.audioCodecs).toEqual(['aac'])
  })

  it('asks for VP9 first in a WebM file', () => {
    const decision = decideExport(defaultEdits(60), { ...options, format: 'webm' }, source)
    expect(decision.fast?.videoCodecs[0]).toBe('vp9')
    expect(decision.fast?.audioCodecs).toEqual(['opus'])
  })

  it('turns a fractional crop into whole pixels with even sides', () => {
    const edits = { ...defaultEdits(60), crop: { x: 0.25, y: 0.5, width: 0.5, height: 0.25 } }
    const decision = decideExport(edits, options, source)
    expect(decision.fast?.crop).toEqual({ left: 640, top: 720, width: 1280, height: 360 })
  })

  it('caps the height to the requested size', () => {
    const decision = decideExport(defaultEdits(60), { ...options, resolution: 720 }, source)
    expect(decision.fast?.height).toBe(720)
  })

  it('never scales a crop up to the requested size', () => {
    const edits = { ...defaultEdits(60), crop: { x: 0, y: 0, width: 1, height: 0.25 } }
    const decision = decideExport(edits, { ...options, resolution: 1080 }, source)
    expect(decision.fast?.height).toBe(360)
  })

  it('drops the audio track when the recording is muted', () => {
    const decision = decideExport({ ...defaultEdits(60), muted: true }, options, source)
    expect(decision.fast?.audioCodecs).toEqual([])
  })

  it('keeps a speed change on the fast path when there is no audio', () => {
    const decision = decideExport({ ...defaultEdits(60), speed: 2 }, options, { ...source, hasAudio: false })
    expect(decision.engine).toBe('webcodecs')
    expect(decision.fast?.speed).toBe(2)
  })

  it('falls back to software when audio has to change speed', () => {
    const decision = decideExport({ ...defaultEdits(60), speed: 2 }, options, source)
    expect(decision.engine).toBe('ffmpeg')
    expect(decision.fast).toBeNull()
  })

  it('falls back to software for GIF and MP3', () => {
    expect(decideExport(defaultEdits(60), { ...options, format: 'gif' }, source).engine).toBe('ffmpeg')
    expect(decideExport(defaultEdits(60), { ...options, format: 'mp3' }, source).engine).toBe('ffmpeg')
  })

  it('writes WAV without a video track', () => {
    const decision = decideExport(defaultEdits(60), { ...options, format: 'wav' }, source)
    expect(decision.engine).toBe('webcodecs')
    expect(decision.fast?.videoCodecs).toEqual([])
    expect(decision.fast?.audioCodecs).toEqual(['pcm-s16'])
  })

  it('falls back to software when a WAV is asked of a silent recording', () => {
    const decision = decideExport(defaultEdits(60), { ...options, format: 'wav' }, { ...source, hasAudio: false })
    expect(decision.engine).toBe('ffmpeg')
  })

  it('passes the trim range straight through', () => {
    const edits = { ...defaultEdits(60), trimStart: 5, trimEnd: 20 }
    const decision = decideExport(edits, options, source)
    expect(decision.fast?.trimStart).toBe(5)
    expect(decision.fast?.trimEnd).toBe(20)
  })
})
