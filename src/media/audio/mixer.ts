/**
 * Mixes microphone and system audio into a single track for the recorder.
 * Web Audio runs on its own thread, so this keeps working while the page is
 * hidden. Muting is a gain change, not a track stop, so the timeline stays
 * aligned with the video.
 */
export interface AudioMix {
  track: MediaStreamTrack | null
  setMicMuted(muted: boolean): void
  setMicGain(value: number): void
  close(): Promise<void>
}

export const emptyMix: AudioMix = {
  track: null,
  setMicMuted: () => {},
  setMicGain: () => {},
  close: async () => {},
}

export function createAudioMix(micStream: MediaStream | null, systemStream: MediaStream | null): AudioMix {
  const micTracks = micStream?.getAudioTracks() ?? []
  const systemTracks = systemStream?.getAudioTracks() ?? []
  if (micTracks.length === 0 && systemTracks.length === 0) return emptyMix

  const context = new AudioContext()
  const destination = context.createMediaStreamDestination()
  const micGain = context.createGain()
  micGain.connect(destination)

  if (micTracks.length > 0) {
    context.createMediaStreamSource(new MediaStream(micTracks)).connect(micGain)
  }
  if (systemTracks.length > 0) {
    const systemGain = context.createGain()
    systemGain.gain.value = 1
    context.createMediaStreamSource(new MediaStream(systemTracks)).connect(systemGain)
    systemGain.connect(destination)
  }

  let gainBeforeMute = 1
  return {
    track: destination.stream.getAudioTracks()[0] ?? null,
    setMicMuted(muted: boolean) {
      if (muted) {
        gainBeforeMute = micGain.gain.value || 1
        micGain.gain.value = 0
      } else {
        micGain.gain.value = gainBeforeMute
      }
    },
    setMicGain(value: number) {
      gainBeforeMute = value
      micGain.gain.value = value
    },
    async close() {
      await context.close().catch(() => undefined)
    },
  }
}
