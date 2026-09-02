import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp, formatTimecode } from '../../lib/format'

interface Props {
  duration: number
  trimStart: number
  trimEnd: number
  currentTime: number
  previewSrc?: string
  previewAspect?: number
  onPreview(patch: { trimStart?: number; trimEnd?: number }): void
  onCommit(patch: { trimStart?: number; trimEnd?: number }): void
  onSeek(time: number): void
}

type Drag = 'start' | 'end' | 'playhead'

/**
 * A small still frame of the recording at the scrubbed time. It follows the
 * pointer along the timeline so you can see where a trim handle lands.
 */
function ScrubPreview({ src, time, left, aspect }: { src: string; time: number; left: string; aspect: number }) {
  const ref = useRef<HTMLVideoElement>(null)
  const pending = useRef<number | null>(null)

  // One seek at a time. A newer time replaces the one that is waiting.
  useEffect(() => {
    const video = ref.current
    if (!video) return
    pending.current = time
    if (video.seeking) return
    pending.current = null
    video.currentTime = time
  }, [time])

  function onSeeked() {
    const video = ref.current
    if (!video || pending.current === null) return
    const next = pending.current
    pending.current = null
    video.currentTime = next
  }

  return (
    <div className="tl-preview" style={{ left: `clamp(90px, ${left}, calc(100% - 90px))` }}>
      <video ref={ref} src={src} muted playsInline preload="auto" style={{ aspectRatio: aspect }} onSeeked={onSeeked} />
      <span className="tl-preview-time">{formatTimecode(time)}</span>
    </div>
  )
}

export function Timeline({
  duration,
  trimStart,
  trimEnd,
  currentTime,
  previewSrc,
  previewAspect,
  onPreview,
  onCommit,
  onSeek,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const [scrubTime, setScrubTime] = useState<number | null>(null)

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
      setScrubTime(time)
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
    <div className="timeline-wrap">
      <div
        className="timeline"
        ref={ref}
        onPointerDown={(event) => startDrag('playhead', event)}
        onPointerMove={(event) => {
          if (drag.current) move(event.clientX, false)
          else setScrubTime(timeAt(event.clientX))
        }}
        onPointerLeave={() => {
          if (!drag.current) setScrubTime(null)
        }}
        onPointerUp={(event) => {
          if (drag.current === 'start' || drag.current === 'end') move(event.clientX, true)
          drag.current = null
          setScrubTime(null)
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
          onFocus={() => setScrubTime(trimStart)}
          onBlur={() => setScrubTime(null)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              const next = clamp(trimStart - 0.5, 0, trimEnd - 0.1)
              onCommit({ trimStart: next })
              setScrubTime(next)
            }
            if (event.key === 'ArrowRight') {
              const next = clamp(trimStart + 0.5, 0, trimEnd - 0.1)
              onCommit({ trimStart: next })
              setScrubTime(next)
            }
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
          onFocus={() => setScrubTime(trimEnd)}
          onBlur={() => setScrubTime(null)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              const next = clamp(trimEnd - 0.5, trimStart + 0.1, duration)
              onCommit({ trimEnd: next })
              setScrubTime(next)
            }
            if (event.key === 'ArrowRight') {
              const next = clamp(trimEnd + 0.5, trimStart + 0.1, duration)
              onCommit({ trimEnd: next })
              setScrubTime(next)
            }
          }}
        />
        <div className="tl-playhead" style={{ left: percent(currentTime) }} />
      </div>
      {previewSrc && scrubTime !== null ? (
        <ScrubPreview src={previewSrc} time={scrubTime} left={percent(scrubTime)} aspect={previewAspect ?? 16 / 9} />
      ) : null}
      <div className="row meta" style={{ justifyContent: 'space-between', padding: '6px 2px' }}>
        <span>{formatTimecode(currentTime)}</span>
        <span>
          Selection {formatTimecode(trimEnd - trimStart)} of {formatTimecode(duration)}
        </span>
      </div>
    </div>
  )
}
