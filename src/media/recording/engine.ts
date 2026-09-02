import { capabilities, containerFor, pickRecordingMimeType } from '../../capabilities'
import { defaultRecordingName } from '../../lib/format'
import { deleteSessionFiles, openTrackWriter, readTrackFile, type TrackWriter } from '../../storage/opfs/recordingStore'
import { putSession } from '../../storage/indexeddb/db'
import { createAudioMix, emptyMix, type AudioMix } from '../audio/mixer'
import { CaptureError, requestCamera, requestMicrophone, requestScreen, stopStream } from '../capture/sources'
import { audioBitrate, videoBitrate, type QualityLevel } from './quality'
import type { EngineState, RecordedTrack, Recording } from './types'

export interface StartOptions {
  mic: boolean
  micDeviceId?: string
  camera: boolean
  cameraDeviceId?: string
  systemAudio: boolean
  countdownSeconds: number
  frameRate: number
  quality: QualityLevel
  maxDurationMs?: number
}

const CHUNK_MS = 3000
/** How long the steps between the countdown and the first chunk may take. */
const START_TIMEOUT_MS = 15000
/** How long the recorders get to report that they stopped. */
const STOP_TIMEOUT_MS = 8000

const IDLE_STATE: EngineState = {
  status: 'idle',
  durationMs: 0,
  bytes: 0,
  countdown: 0,
  micMuted: false,
  hasMic: false,
  hasSystemAudio: false,
  hasCamera: false,
  error: null,
}

/**
 * Owns everything about an active recording. It is deliberately plain
 * TypeScript with a subscribe callback: React observes it, it never observes
 * React, and no part of the capture path waits on a render or an animation
 * frame. That is what keeps recording alive while the tab sits in the
 * background.
 */
class RecordingEngine {
  private state: EngineState = IDLE_STATE
  private listeners = new Set<() => void>()

  private screenStream: MediaStream | null = null
  private micStream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private mix: AudioMix = emptyMix
  private screenRecorder: MediaRecorder | null = null
  private cameraRecorder: MediaRecorder | null = null
  private screenWriter: TrackWriter | null = null
  private cameraWriter: TrackWriter | null = null
  private memoryBlobs = new Map<string, Blob>()

  private sessionId = ''
  private name = ''
  private createdAt = 0
  private mimeType = ''
  private startedAt = 0
  private accumulatedMs = 0
  private ticker: number | null = null
  private autoStop: number | null = null
  private countdownTimer: number | null = null
  private stopPromise: Promise<Recording | null> | null = null
  /** Counts start attempts, so a slow start that was cancelled cannot come
   * back to life and take over the engine. */
  private startToken = 0
  private cameraListeners = new Set<() => void>()
  private finishedListeners = new Set<(recording: Recording) => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState = (): EngineState => this.state

  subscribeCamera = (listener: () => void): (() => void) => {
    this.cameraListeners.add(listener)
    return () => this.cameraListeners.delete(listener)
  }

  getCameraStream = (): MediaStream | null => this.cameraStream

  /** Fires whenever a recording finishes, including when the user presses the
   * browser's own stop sharing control. */
  onFinished = (listener: (recording: Recording) => void): (() => void) => {
    this.finishedListeners.add(listener)
    return () => this.finishedListeners.delete(listener)
  }

  private set(patch: Partial<EngineState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  private notifyCamera() {
    this.cameraListeners.forEach((listener) => listener())
  }

  /** Live camera preview, available before a recording starts. */
  async openCamera(deviceId?: string): Promise<void> {
    if (this.cameraStream) {
      stopStream(this.cameraStream)
      this.cameraStream = null
    }
    this.cameraStream = await requestCamera(deviceId)
    this.notifyCamera()
  }

  closeCamera(): void {
    if (this.state.status !== 'idle') return
    stopStream(this.cameraStream)
    this.cameraStream = null
    this.notifyCamera()
  }

  async start(options: StartOptions): Promise<void> {
    if (this.state.status !== 'idle') return
    if (!capabilities().screenCapture || !capabilities().mediaRecorder) {
      this.set({ error: 'This browser cannot record the screen.' })
      return
    }

    const token = ++this.startToken
    this.set({ ...IDLE_STATE, status: 'starting' })
    try {
      this.screenStream = await requestScreen(options.systemAudio, options.frameRate)
      if (this.startToken !== token) return this.abandonStart()
      if (options.mic) {
        try {
          this.micStream = await requestMicrophone(options.micDeviceId)
        } catch {
          this.set({ error: 'Microphone unavailable. Recording without it.' })
        }
      }
      if (options.camera && !this.cameraStream) {
        try {
          await this.openCamera(options.cameraDeviceId)
        } catch {
          this.set({ error: 'Camera unavailable. Recording without it.' })
        }
      }
      if (this.startToken !== token) return this.abandonStart()
    } catch (error) {
      this.cleanupStreams()
      this.set({ status: 'idle', error: error instanceof CaptureError ? error.message : 'Recording could not start.' })
      return
    }

    if (options.countdownSeconds > 0) {
      await this.runCountdown(options.countdownSeconds)
      if (this.startToken !== token) return this.abandonStart()
    }

    // The user can press the browser's own stop sharing control while the
    // countdown runs. Recording an ended track gives an empty file.
    if (this.screenStream?.getVideoTracks()[0]?.readyState === 'ended') {
      this.cleanupStreams()
      this.set({ ...IDLE_STATE, error: 'Screen sharing stopped before the recording started.' })
      return
    }

    try {
      await withTimeout(this.beginCapture(options, token), START_TIMEOUT_MS)
    } catch {
      if (this.startToken !== token) return
      this.startToken++
      this.cleanupStreams()
      this.set({ ...IDLE_STATE, error: 'Recording could not start. Try again.' })
    }
  }

  /** Drops a start that something else has already cancelled or replaced. */
  private abandonStart(): void {
    this.cleanupStreams()
  }

  private runCountdown(seconds: number): Promise<void> {
    this.set({ status: 'countdown', countdown: seconds })
    return new Promise((resolve) => {
      const tick = () => {
        const next = this.state.countdown - 1
        if (next <= 0) {
          // Back to 'starting' before the capture is built. The countdown
          // covers the whole screen, and it must never be what the user looks
          // at if the next step is slow.
          this.countdownTimer = null
          this.set({ status: 'starting', countdown: 0 })
          resolve()
          return
        }
        this.set({ countdown: next })
        this.countdownTimer = self.setTimeout(tick, 1000)
      }
      this.countdownTimer = self.setTimeout(tick, 1000)
    })
  }

  private async beginCapture(options: StartOptions, token: number) {
    const screenTrack = this.screenStream!.getVideoTracks()[0]
    const settings = screenTrack.getSettings()
    const width = settings.width ?? 1920
    const height = settings.height ?? 1080
    const frameRate = settings.frameRate ?? options.frameRate

    this.mix = createAudioMix(this.micStream, this.screenStream)
    const recordedStream = new MediaStream([screenTrack])
    if (this.mix.track) recordedStream.addTrack(this.mix.track)

    this.mimeType = pickRecordingMimeType() ?? ''
    this.sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    this.name = defaultRecordingName()
    this.createdAt = Date.now()
    const container = containerFor(this.mimeType)

    const screenWriter = await openTrackWriter(this.sessionId, `screen.${container}`, this.mimeType, (blob) =>
      this.memoryBlobs.set('screen', blob),
    )
    if (this.startToken !== token) {
      await screenWriter.close().catch(() => undefined)
      return
    }
    this.screenWriter = screenWriter

    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: videoBitrate(width, height, frameRate, options.quality),
      audioBitsPerSecond: audioBitrate(options.quality),
    }
    if (this.mimeType) recorderOptions.mimeType = this.mimeType

    this.screenRecorder = new MediaRecorder(recordedStream, recorderOptions)
    this.screenRecorder.ondataavailable = (event) => {
      if (event.data.size === 0) return
      this.set({ bytes: this.state.bytes + event.data.size })
      void this.screenWriter?.write(event.data).catch(() => undefined)
    }
    this.screenRecorder.start(CHUNK_MS)

    if (this.cameraStream) {
      const cameraTrack = this.cameraStream.getVideoTracks()[0]
      if (cameraTrack) {
        const cameraWriter = await openTrackWriter(this.sessionId, `camera.${container}`, this.mimeType, (blob) =>
          this.memoryBlobs.set('camera', blob),
        )
        if (this.startToken !== token) {
          await cameraWriter.close().catch(() => undefined)
          return
        }
        this.cameraWriter = cameraWriter
        this.cameraRecorder = new MediaRecorder(new MediaStream([cameraTrack]), {
          ...recorderOptions,
          videoBitsPerSecond: videoBitrate(1280, 720, 30, options.quality),
        })
        this.cameraRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) void this.cameraWriter?.write(event.data).catch(() => undefined)
        }
        this.cameraRecorder.start(CHUNK_MS)
      }
    }

    // The browser's own "Stop sharing" control ends the track, not the page.
    screenTrack.addEventListener('ended', () => void this.stop())

    this.startedAt = Date.now()
    this.accumulatedMs = 0
    this.ticker = self.setInterval(() => this.set({ durationMs: this.elapsed() }), 250)
    if (options.maxDurationMs) {
      this.autoStop = self.setTimeout(() => void this.stop(), options.maxDurationMs)
    }

    this.set({
      status: 'recording',
      durationMs: 0,
      hasMic: !!this.micStream,
      hasSystemAudio: this.screenStream!.getAudioTracks().length > 0,
      hasCamera: !!this.cameraRecorder,
      micMuted: false,
    })

    await putSession({
      id: this.sessionId,
      name: this.name,
      createdAt: this.createdAt,
      durationMs: 0,
      status: 'recording',
      mimeType: this.mimeType,
      screenFile: `screen.${container}`,
      cameraFile: this.cameraRecorder ? `camera.${container}` : undefined,
      bytes: 0,
      width,
      height,
      hasAudio: !!this.mix.track,
    }).catch(() => undefined)
  }

  private elapsed(): number {
    if (this.state.status === 'paused') return this.accumulatedMs
    return this.accumulatedMs + (Date.now() - this.startedAt)
  }

  pause(): void {
    if (this.state.status !== 'recording' || !this.screenRecorder) return
    this.screenRecorder.pause()
    this.cameraRecorder?.pause()
    this.accumulatedMs += Date.now() - this.startedAt
    this.set({ status: 'paused', durationMs: this.accumulatedMs })
  }

  resume(): void {
    if (this.state.status !== 'paused' || !this.screenRecorder) return
    this.screenRecorder.resume()
    this.cameraRecorder?.resume()
    this.startedAt = Date.now()
    this.set({ status: 'recording' })
  }

  setMicMuted(muted: boolean): void {
    this.mix.setMicMuted(muted)
    this.set({ micMuted: muted })
  }

  async stop(): Promise<Recording | null> {
    if (this.stopPromise) return this.stopPromise
    if (this.state.status === 'idle' || this.state.status === 'starting') return null
    this.stopPromise = this.finish()
    const result = await this.stopPromise
    this.stopPromise = null
    return result
  }

  cancelCountdown(): void {
    if (this.state.status === 'recording' || this.state.status === 'paused') return
    this.startToken++
    this.clearCountdown()
    this.cleanupStreams()
    this.set({ ...IDLE_STATE })
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) self.clearTimeout(this.countdownTimer)
    this.countdownTimer = null
  }

  private async finish(): Promise<Recording | null> {
    const durationMs = this.elapsed()
    this.set({ status: 'stopping', durationMs })
    if (this.ticker !== null) self.clearInterval(this.ticker)
    if (this.autoStop !== null) self.clearTimeout(this.autoStop)
    this.ticker = null
    this.autoStop = null
    this.clearCountdown()

    // A recorder that never reports its stop must not hold the app in the
    // stopping state. Whatever landed on disk is still a recording.
    await withTimeout(
      Promise.all([stopRecorder(this.screenRecorder), stopRecorder(this.cameraRecorder)]),
      STOP_TIMEOUT_MS,
    ).catch(() => undefined)
    const screenBytes = await this.screenWriter?.close().catch(() => this.screenWriter?.bytesWritten() ?? 0) ?? 0
    await this.cameraWriter?.close().catch(() => undefined)

    const container = containerFor(this.mimeType)
    const screenTrack = await this.resolveTrack('screen', `screen.${container}`)
    const cameraTrack = this.cameraWriter ? await this.resolveTrack('camera', `camera.${container}`) : undefined

    const settings = this.screenStream?.getVideoTracks()[0]?.getSettings()
    const recording: Recording | null = screenTrack
      ? {
          sessionId: this.sessionId,
          name: this.name,
          createdAt: this.createdAt,
          durationMs,
          mimeType: this.mimeType,
          container,
          width: settings?.width ?? 1920,
          height: settings?.height ?? 1080,
          hasAudio: !!this.mix.track,
          bytes: screenBytes,
          persisted: this.memoryBlobs.size === 0,
          screen: screenTrack,
          camera: cameraTrack ?? undefined,
        }
      : null

    if (recording) {
      await putSession({
        id: recording.sessionId,
        name: recording.name,
        createdAt: recording.createdAt,
        durationMs: recording.durationMs,
        status: 'complete',
        mimeType: recording.mimeType,
        screenFile: recording.screen.fileName,
        cameraFile: recording.camera?.fileName,
        bytes: recording.bytes,
        width: recording.width,
        height: recording.height,
        hasAudio: recording.hasAudio,
      }).catch(() => undefined)
    } else {
      await deleteSessionFiles(this.sessionId)
    }

    await this.mix.close()
    this.cleanupStreams()
    this.screenRecorder = null
    this.cameraRecorder = null
    this.screenWriter = null
    this.cameraWriter = null
    this.memoryBlobs.clear()
    this.set({ ...IDLE_STATE })
    if (recording) this.finishedListeners.forEach((listener) => listener(recording))
    return recording
  }

  private async resolveTrack(key: string, fileName: string): Promise<RecordedTrack | null> {
    const memory = this.memoryBlobs.get(key)
    const blob = memory ?? (await readTrackFile(this.sessionId, fileName))
    if (!blob || blob.size === 0) return null
    return { blob, url: URL.createObjectURL(blob), fileName }
  }

  private cleanupStreams() {
    stopStream(this.screenStream)
    stopStream(this.micStream)
    stopStream(this.cameraStream)
    this.screenStream = null
    this.micStream = null
    this.cameraStream = null
    this.notifyCamera()
  }
}

/**
 * Rejects if the work does not finish in time. Storage and media calls can
 * stay unanswered for ever in some browsers, and a start that never finishes
 * leaves the user in front of a screen with no way out.
 */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = self.setTimeout(() => reject(new Error('timed out')), ms)
    work.then(
      (value) => {
        self.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        self.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function stopRecorder(recorder: MediaRecorder | null): Promise<void> {
  if (!recorder || recorder.state === 'inactive') return Promise.resolve()
  return new Promise((resolve) => {
    recorder.addEventListener('stop', () => resolve(), { once: true })
    recorder.stop()
  })
}

export const recordingEngine = new RecordingEngine()
