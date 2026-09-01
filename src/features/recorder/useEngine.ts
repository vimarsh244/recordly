import { useEffect, useState, useSyncExternalStore } from 'react'
import { recordingEngine } from '../../media/recording/engine'
import type { EngineState } from '../../media/recording/types'

export function useEngineState(): EngineState {
  return useSyncExternalStore(recordingEngine.subscribe, recordingEngine.getState)
}

export function useCameraStream(): MediaStream | null {
  return useSyncExternalStore(recordingEngine.subscribeCamera, recordingEngine.getCameraStream)
}

/** Attaches a stream to a video element without going through React state. */
export function useStreamRef(stream: MediaStream | null) {
  const [element, setElement] = useState<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (!element) return
    element.srcObject = stream
    if (stream) void element.play().catch(() => undefined)
  }, [element, stream])
  return setElement
}
