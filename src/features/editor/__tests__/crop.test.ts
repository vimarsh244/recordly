import { describe, expect, it } from 'vitest'
import { applyDrag, cropForAspect } from '../CropTool'

const full = { x: 0, y: 0, width: 1, height: 1 }

describe('applyDrag', () => {
  it('keeps a moved box inside the frame', () => {
    const box = { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
    expect(applyDrag(box, 'move', 0.4, 0.4)).toEqual({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 })
    expect(applyDrag(box, 'move', -0.2, -0.2).x).toBeCloseTo(0.3)
  })

  it('resizes from a corner without inverting the box', () => {
    const resized = applyDrag(full, 'se', -0.5, -0.5)
    expect(resized.width).toBeCloseTo(0.5)
    expect(resized.height).toBeCloseTo(0.5)
    const collapsed = applyDrag(full, 'se', -2, -2)
    expect(collapsed.width).toBeCloseTo(0.05)
  })

  it('moves the origin when dragging the top left corner', () => {
    const resized = applyDrag(full, 'nw', 0.25, 0.25)
    expect(resized.x).toBeCloseTo(0.25)
    expect(resized.width).toBeCloseTo(0.75)
  })
})

describe('cropForAspect', () => {
  it('letterboxes a wide source into a square', () => {
    const crop = cropForAspect(1, 1920, 1080)
    expect(crop.height).toBe(1)
    expect(crop.width).toBeCloseTo(1080 / 1920)
    expect(crop.x).toBeCloseTo((1 - 1080 / 1920) / 2)
  })

  it('trims height for a taller target', () => {
    const crop = cropForAspect(9 / 16, 1920, 1080)
    expect(crop.width).toBeCloseTo((9 / 16) / (1920 / 1080))
  })
})
