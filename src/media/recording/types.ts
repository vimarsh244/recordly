export interface RecordedTrack {
  blob: Blob
  url: string
  fileName: string
}

export interface Recording {
  sessionId: string
  name: string
  createdAt: number
  durationMs: number
  mimeType: string
  container: 'webm' | 'mp4'
  width: number
  height: number
  hasAudio: boolean
  bytes: number
  persisted: boolean
  screen: RecordedTrack
  camera?: RecordedTrack
}

export type RecorderStatus = 'idle' | 'starting' | 'countdown' | 'recording' | 'paused' | 'stopping'

export interface EngineState {
  status: RecorderStatus
  durationMs: number
  bytes: number
  countdown: number
  micMuted: boolean
  hasMic: boolean
  hasSystemAudio: boolean
  hasCamera: boolean
  error: string | null
}
