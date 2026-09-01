import { useRef } from 'react'
import { clamp } from '../../lib/format'
import type { CropRect } from '../project/types'

const HANDLES = [
  { key: 'nw', x: 0, y: 0 },
  { key: 'ne', x: 1, y: 0 },
  { key: 'sw', x: 0, y: 1 },
  { key: 'se', x: 1, y: 1 },
] as const

interface Props {
  crop: CropRect
  onPreview(crop: CropRect): void
  onCommit(crop: CropRect): void
}

/** Drag the box over the preview. No numeric fields, on purpose. */
export function CropTool({ crop, onPreview, onCommit }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ handle: string; startX: number; startY: number; origin: CropRect } | null>(null)

  function begin(handle: string, event: React.PointerEvent) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { handle, startX: event.clientX, startY: event.clientY, origin: crop }
  }

  function onMove(event: React.PointerEvent) {
    const current = drag.current
    const parent = ref.current?.parentElement
    if (!current || !parent) return
    const rect = parent.getBoundingClientRect()
    const dx = (event.clientX - current.startX) / rect.width
    const dy = (event.clientY - current.startY) / rect.height
    onPreview(applyDrag(current.origin, current.handle, dx, dy))
  }

  function end() {
    if (drag.current) onCommit(crop)
    drag.current = null
  }

  return (
    <div
      className="crop-box"
      ref={ref}
      style={{
        left: `${crop.x * 100}%`,
        top: `${crop.y * 100}%`,
        width: `${crop.width * 100}%`,
        height: `${crop.height * 100}%`,
      }}
      onPointerDown={(event) => begin('move', event)}
      onPointerMove={onMove}
      onPointerUp={end}
    >
      {HANDLES.map((handle) => (
        <div
          key={handle.key}
          className="crop-handle"
          style={{
            left: handle.x === 0 ? -6 : undefined,
            right: handle.x === 1 ? -6 : undefined,
            top: handle.y === 0 ? -6 : undefined,
            bottom: handle.y === 1 ? -6 : undefined,
            cursor: `${handle.key}-resize`,
          }}
          onPointerDown={(event) => begin(handle.key, event)}
          onPointerMove={onMove}
          onPointerUp={end}
        />
      ))}
    </div>
  )
}

export function applyDrag(origin: CropRect, handle: string, dx: number, dy: number): CropRect {
  const min = 0.05
  if (handle === 'move') {
    return {
      ...origin,
      x: clamp(origin.x + dx, 0, 1 - origin.width),
      y: clamp(origin.y + dy, 0, 1 - origin.height),
    }
  }
  let { x, y, width, height } = origin
  if (handle.includes('w')) {
    const nextX = clamp(x + dx, 0, x + width - min)
    width += x - nextX
    x = nextX
  }
  if (handle.includes('e')) {
    width = clamp(width + dx, min, 1 - x)
  }
  if (handle.includes('n')) {
    const nextY = clamp(y + dy, 0, y + height - min)
    height += y - nextY
    y = nextY
  }
  if (handle.includes('s')) {
    height = clamp(height + dy, min, 1 - y)
  }
  return { x, y, width, height }
}

/** Largest centred box with the given aspect, in source fractions. */
export function cropForAspect(aspect: number, sourceWidth: number, sourceHeight: number): CropRect {
  const sourceAspect = sourceWidth / sourceHeight
  if (aspect > sourceAspect) {
    const height = sourceAspect / aspect
    return { x: 0, y: (1 - height) / 2, width: 1, height }
  }
  const width = aspect / sourceAspect
  return { x: (1 - width) / 2, y: 0, width, height: 1 }
}
