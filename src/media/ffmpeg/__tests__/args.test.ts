import { describe, expect, it } from 'vitest'
import { planExport } from '../args'
import { defaultEdits, type ExportOptions, type SourceInfo } from '../../../features/project/types'

const source: SourceInfo = { width: 1920, height: 1080, durationSeconds: 60, hasAudio: true, container: 'webm' }
const options: ExportOptions = { format: 'webm', quality: 'original', resolution: 'original' }

describe('planExport', () => {
  it('copies the streams when nothing changed and the container matches', () => {
    const plan = planExport('input.webm', defaultEdits(60), options, source)
    expect(plan.streamCopy).toBe(true)
    expect(plan.args).toContain('copy')
  })

  it('re-encodes when the container changes', () => {
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'mp4' }, source)
    expect(plan.streamCopy).toBe(false)
    expect(plan.args).toContain('libx264')
    expect(plan.args).toContain('aac')
    expect(plan.outputName).toBe('output.mp4')
  })

  it('seeks and limits duration for a trim, both before the input', () => {
    const edits = { ...defaultEdits(60), trimStart: 5, trimEnd: 20 }
    const plan = planExport('input.webm', edits, options, source)
    // `-t` after `-i` would cap the output instead of the source, which cuts a
    // slowed clip short.
    expect(plan.args.slice(0, 8)).toEqual(['-nostdin', '-y', '-ss', '5.000', '-t', '15.000', '-i', 'input.webm'])
  })

  it('keeps the whole selection when a trimmed clip is slowed down', () => {
    const edits = { ...defaultEdits(60), trimStart: 5, trimEnd: 20, speed: 0.5 }
    const plan = planExport('input.webm', edits, { ...options, format: 'mp4' }, source)
    expect(plan.args.indexOf('-t')).toBeLessThan(plan.args.indexOf('-i'))
    expect(plan.args[plan.args.indexOf('-t') + 1]).toBe('15.000')
    expect(plan.outputSeconds).toBe(30)
  })

  it('turns a fractional crop into pixels with even sides', () => {
    const edits = { ...defaultEdits(60), crop: { x: 0.25, y: 0.5, width: 0.5, height: 0.25 } }
    const plan = planExport('input.webm', edits, { ...options, format: 'mp4' }, source)
    expect(plan.args[plan.args.indexOf('-vf') + 1]).toBe('crop=960:270:480:540')
  })

  it('drops audio when muted', () => {
    const edits = { ...defaultEdits(60), muted: true }
    const plan = planExport('input.webm', edits, { ...options, format: 'mp4' }, source)
    expect(plan.args).toContain('-an')
    expect(plan.args).not.toContain('aac')
  })

  it('applies speed to video and audio', () => {
    const edits = { ...defaultEdits(60), speed: 2 }
    const plan = planExport('input.webm', edits, { ...options, format: 'mp4' }, source)
    expect(plan.args[plan.args.indexOf('-vf') + 1]).toContain('setpts=0.5000*PTS')
    expect(plan.args[plan.args.indexOf('-af') + 1]).toContain('atempo=2.0000')
  })

  it('applies a fractional speed to video and audio', () => {
    const edits = { ...defaultEdits(60), speed: 0.75 }
    const plan = planExport('input.webm', edits, { ...options, format: 'mp4' }, source)
    expect(plan.args[plan.args.indexOf('-vf') + 1]).toContain('setpts=1.3333*PTS')
    expect(plan.args[plan.args.indexOf('-af') + 1]).toContain('atempo=0.7500')
    expect(plan.outputSeconds).toBeCloseTo(80, 5)
  })

  it('writes VP8 for WebM, because the WebAssembly VP9 encoder crashes', () => {
    const edits = { ...defaultEdits(60), speed: 0.75 }
    const plan = planExport('input.webm', edits, options, source, { threads: 8 })
    expect(plan.args).toContain('libvpx')
    expect(plan.args).not.toContain('libvpx-vp9')
    // VP9 only options. libvpx rejects them.
    expect(plan.args).not.toContain('-row-mt')
    expect(plan.args).not.toContain('-tile-columns')
  })

  it('builds a palette chain for gif and never keeps audio', () => {
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'gif' }, source)
    expect(plan.args).toContain('-an')
    expect(plan.args.join(' ')).toContain('palettegen')
  })

  it('drops the frame rate of a gif before it scales the frames', () => {
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'gif' }, source)
    const chain = plan.args[plan.args.indexOf('-filter_complex') + 1]
    expect(chain.indexOf('fps=')).toBeLessThan(chain.indexOf('scale='))
  })

  it('strips video for audio only formats', () => {
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'wav' }, source)
    expect(plan.args).toContain('-vn')
    expect(plan.args).toContain('pcm_s16le')
  })

  it('scales to the requested height without enlarging a smaller clip', () => {
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'mp4', resolution: 720 }, source)
    expect(plan.args[plan.args.indexOf('-vf') + 1]).toContain("scale=-2:'min(720,ih)'")
  })

  it('never asks for an odd width', () => {
    // 480p from a 16:9 source used to give 853 pixels across, which x264 rejects.
    const plan = planExport('input.webm', defaultEdits(60), { ...options, format: 'mp4', resolution: 480 }, source)
    expect(plan.args.join(' ')).not.toContain('force_original_aspect_ratio')
  })

  it('picks an audio encoder that the WebAssembly build can run', () => {
    const edits = { ...defaultEdits(60), speed: 0.75 }
    const plan = planExport('input.webm', edits, options, source)
    expect(plan.args).toContain('libvorbis')
    expect(plan.args).not.toContain('libopus')
  })
})
