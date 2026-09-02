import { describe, expect, it } from 'vitest'
import { frameTimestamps, paletteTimestamps } from '../gif'
import type { GifPlan } from '../plan'

const plan: GifPlan = {
  crop: null,
  width: 640,
  height: 360,
  frameRate: 10,
  trimStart: 0,
  trimEnd: 2,
  speed: 1,
  maxColors: 255,
  estimatedFrames: 20,
}

describe('frameTimestamps', () => {
  it('spaces the frames by the frame rate', () => {
    const stamps = frameTimestamps(plan)
    expect(stamps).toHaveLength(20)
    expect(stamps[0]).toBe(0)
    expect(stamps[1]).toBeCloseTo(0.1)
    expect(stamps[19]).toBeCloseTo(1.9)
  })

  it('starts where the trim starts', () => {
    const stamps = frameTimestamps({ ...plan, trimStart: 5, trimEnd: 6, estimatedFrames: 10 })
    expect(stamps[0]).toBe(5)
    expect(stamps).toHaveLength(10)
  })

  it('takes bigger steps when the clip plays faster', () => {
    const stamps = frameTimestamps({ ...plan, speed: 2, estimatedFrames: 10 })
    expect(stamps).toHaveLength(10)
    expect(stamps[1]).toBeCloseTo(0.2)
  })

  it('always gives at least one frame', () => {
    expect(frameTimestamps({ ...plan, trimEnd: 0, estimatedFrames: 1 })).toEqual([0])
  })
})

describe('paletteTimestamps', () => {
  it('keeps every frame of a short clip', () => {
    const stamps = [0, 0.1, 0.2]
    expect(paletteTimestamps(stamps)).toEqual(stamps)
  })

  it('spreads the sample across a long clip', () => {
    const stamps = Array.from({ length: 100 }, (_, index) => index)
    const picked = paletteTimestamps(stamps, 10)
    expect(picked).toHaveLength(10)
    expect(picked[0]).toBe(0)
    expect(picked[9]).toBe(90)
  })
})
