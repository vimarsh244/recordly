export interface DeviceOption {
  deviceId: string
  label: string
}

export class CaptureError extends Error {
  constructor(message: string, readonly kind: 'cancelled' | 'unavailable' | 'unsupported') {
    super(message)
    this.name = 'CaptureError'
  }
}

function toCaptureError(error: unknown, subject: string): CaptureError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return new CaptureError(`${subject} access was cancelled.`, 'cancelled')
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new CaptureError(`${subject} unavailable.`, 'unavailable')
  }
  return new CaptureError(`${subject} could not start.`, 'unavailable')
}

export async function requestScreen(withSystemAudio: boolean, frameRate: number): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: frameRate } },
      audio: withSystemAudio,
    })
  } catch (error) {
    if (withSystemAudio) {
      // Some browsers reject the whole request when audio is asked for.
      try {
        return await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: frameRate } } })
      } catch (retryError) {
        throw toCaptureError(retryError, 'Screen')
      }
    }
    throw toCaptureError(error, 'Screen')
  }
}

export async function requestMicrophone(deviceId?: string): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : { echoCancellation: true, noiseSuppression: true },
    })
  } catch (error) {
    throw toCaptureError(error, 'Microphone')
  }
}

export async function requestCamera(deviceId?: string): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    })
  } catch (error) {
    throw toCaptureError(error, 'Camera')
  }
}

export async function listDevices(kind: MediaDeviceKind): Promise<DeviceOption[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((device) => device.kind === kind)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${kind === 'audioinput' ? 'Microphone' : 'Camera'} ${index + 1}`,
    }))
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}
