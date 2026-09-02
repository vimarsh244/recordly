/**
 * One place that answers "what can this browser do".
 * Nothing else in the app should sniff browser names or poke at feature flags.
 */
export interface Capabilities {
  screenCapture: boolean
  userMedia: boolean
  mediaRecorder: boolean
  systemAudioLikely: boolean
  webCodecs: boolean
  offscreenCanvas: boolean
  opfs: boolean
  sharedArrayBuffer: boolean
  webGPU: boolean
  storageEstimate: boolean
}

export function detectCapabilities(): Capabilities {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined
  const recorderSupported = typeof MediaRecorder !== 'undefined'
  return {
    screenCapture: !!md && typeof md.getDisplayMedia === 'function',
    userMedia: !!md && typeof md.getUserMedia === 'function',
    mediaRecorder: recorderSupported,
    // Only Chromium exposes display-surface audio today. Confirmed for real
    // after getDisplayMedia returns, by looking for an audio track.
    systemAudioLikely: typeof navigator !== 'undefined' && !!(navigator as { userAgentData?: unknown }).userAgentData,
    webCodecs: typeof window !== 'undefined' && 'VideoEncoder' in window,
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    opfs: typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined' && typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated,
    webGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
    storageEstimate: typeof navigator !== 'undefined' && !!navigator.storage?.estimate,
  }
}

let cached: Capabilities | null = null

export function capabilities(): Capabilities {
  if (!cached) cached = detectCapabilities()
  return cached
}

/** Candidate recording containers, best first. */
const VIDEO_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
]

export function pickRecordingMimeType(candidates = VIDEO_MIME_CANDIDATES): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

export function containerFor(mimeType: string | undefined): 'webm' | 'mp4' {
  return mimeType && mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
}
