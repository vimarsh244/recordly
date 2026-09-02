import { useCallback, useRef } from 'react'
import { clamp, formatTimecode } from '../../lib/format'

interface Props {
  duration: number
  trimStart: number
  trimEnd: number
  currentTime: number
  onPreview(patch: { trimStart?: number; trimEnd?: number }): void
  onCommit(patch: { trimStart?: number; trimEnd?: number }): void
  onSeek(time: number): void
}

type Drag = 'start' | 'end' | 'playhead'

export function Timeline({ duration, trimStart, trimEnd, currentTime, onPreview, onCommit, onSeek }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return 0
      return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration)
    },
    [duration],
  )

  const move = useCallback(
    (clientX: number, commit: boolean) => {
      const time = timeAt(clientX)
      const apply = commit ? onCommit : onPreview
      if (drag.current === 'start') apply({ trimStart: Math.min(time, trimEnd - 0.1) })
      else if (drag.current === 'end') apply({ trimEnd: Math.max(time, trimStart + 0.1) })
      else onSeek(clamp(time, trimStart, trimEnd))
    },
    [onCommit, onPreview, onSeek, timeAt, trimEnd, trimStart],
  )

  function startDrag(kind: Drag, event: React.PointerEvent) {
    drag.current = kind
    event.currentTarget.setPointerCapture(event.pointerId)
    move(event.clientX, false)
  }

  const percent = (time: number) => `${(duration > 0 ? time / duration : 0) * 100}%`

  return (
    <>
      <div
        className="timeline"
        ref={ref}
        onPointerDown={(event) => startDrag('playhead', event)}
        onPointerMove={(event) => {
          if (drag.current) move(event.clientX, false)
        }}
        onPointerUp={(event) => {
          if (drag.current === 'start' || drag.current === 'end') move(event.clientX, true)
          drag.current = null
        }}
      >
        <div className="tl-keep" style={{ left: percent(trimStart), width: percent(trimEnd - trimStart) }} />
        <div
          className="tl-handle"
          role="slider"
          tabIndex={0}
          aria-label="Trim start"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimStart}
          style={{ left: percent(trimStart) }}
          onPointerDown={(event) => {
            event.stopPropagation()
            startDrag('start', event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') onCommit({ trimStart: clamp(trimStart - 0.5, 0, trimEnd - 0.1) })
            if (event.key === 'ArrowRight') onCommit({ trimStart: clamp(trimStart + 0.5, 0, trimEnd - 0.1) })
          }}
        />
        <div
          className="tl-handle"
          role="slider"
          tabIndex={0}
          aria-label="Trim end"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimEnd}
          style={{ left: percent(trimEnd) }}
          onPointerDown={(event) => {
            event.stopPropagation()
            startDrag('end', event)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') onCommit({ trimEnd: clamp(trimEnd - 0.5, trimStart + 0.1, duration) })
            if (event.key === 'ArrowRight') onCommit({ trimEnd: clamp(trimEnd + 0.5, trimStart + 0.1, duration) })
          }}
        />
        <div className="tl-playhead" style={{ left: percent(currentTime) }} />
      </div>
      <div className="row meta" style={{ justifyContent: 'space-between', padding: '6px 2px' }}>
        <span>{formatTimecode(currentTime)}</span>
        <span>
          Selection {formatTimecode(trimEnd - trimStart)} of {formatTimecode(duration)}
        </span>
      </div>
    </>
  )
}
