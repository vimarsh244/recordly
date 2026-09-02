import { useEffect, useState } from 'react'
import { useApp } from '../../app/store'
import { capabilities } from '../../capabilities'
import { listDevices, type DeviceOption } from '../../media/capture/sources'
import { recordingEngine } from '../../media/recording/engine'
import { RecordingBar } from './RecordingBar'
import { CountdownOverlay } from './CountdownOverlay'
import { useEngineState } from './useEngine'

function DeviceRow({
  label,
  devices,
  value,
  onChange,
}: {
  label: string
  devices: DeviceOption[]
  value?: string
  onChange(deviceId?: string): void
}) {
  return (
    <div className="field">
      <label htmlFor={`device-${label}`}>{label}</label>
      <select
        id={`device-${label}`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">Default</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function RecorderPanel() {
  const state = useEngineState()
  const settings = useApp((s) => s.settings)
  const updateSettings = useApp((s) => s.updateSettings)
  const [openMenu, setOpenMenu] = useState<'mic' | 'camera' | null>(null)
  const [mics, setMics] = useState<DeviceOption[]>([])
  const [cameras, setCameras] = useState<DeviceOption[]>([])
  const caps = capabilities()

  useEffect(() => {
    if (!openMenu) return
    void listDevices(openMenu === 'mic' ? 'audioinput' : 'videoinput').then((devices) =>
      openMenu === 'mic' ? setMics(devices) : setCameras(devices),
    )
  }, [openMenu])

  if (state.status === 'recording' || state.status === 'paused' || state.status === 'stopping') {
    return <RecordingBar state={state} />
  }

  const starting = state.status === 'starting'

  async function toggleCamera() {
    const next = !settings.camera
    updateSettings({ camera: next })
    if (next) {
      try {
        await recordingEngine.openCamera(settings.cameraDeviceId)
      } catch {
        updateSettings({ camera: false })
      }
    } else {
      recordingEngine.closeCamera()
    }
  }

  function start() {
    void recordingEngine.start({
      mic: settings.mic,
      micDeviceId: settings.micDeviceId,
      camera: settings.camera,
      cameraDeviceId: settings.cameraDeviceId,
      systemAudio: settings.systemAudio,
      countdownSeconds: settings.countdownSeconds,
      frameRate: settings.frameRate,
      quality: settings.quality,
      maxDurationMs: settings.maxDurationMinutes ? settings.maxDurationMinutes * 60_000 : undefined,
    })
  }

  if (!caps.screenCapture || !caps.mediaRecorder) {
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Screen recording is not supported here</span>
        </div>
        <p className="note">Phones do not let a web page record the screen. Use a desktop browser.</p>
      </div>
    )
  }

  return (
    <>
      {state.status === 'countdown' ? (
        <CountdownOverlay value={state.countdown} onCancel={() => recordingEngine.cancelCountdown()} />
      ) : null}

      <div className="panel">
        {state.error ? (
          <div className="banner" role="status">
            <span className="msg">{state.error}</span>
          </div>
        ) : null}

        <div className="control" aria-hidden="true">
          <span className="control-label">Screen</span>
          <span className="control-value">Picked when you start</span>
        </div>

        <div className="row">
          <button
            className="control"
            aria-pressed={settings.mic}
            onClick={() => updateSettings({ mic: !settings.mic })}
          >
            <span className="control-label">Mic</span>
            <span className="control-value">{settings.mic ? 'On' : 'Off'}</span>
          </button>
          <button
            className="control-more"
            aria-label="Microphone options"
            aria-expanded={openMenu === 'mic'}
            onClick={() => setOpenMenu(openMenu === 'mic' ? null : 'mic')}
          >
            •••
          </button>
        </div>
        {openMenu === 'mic' ? (
          <DeviceRow
            label="Microphone"
            devices={mics}
            value={settings.micDeviceId}
            onChange={(micDeviceId) => updateSettings({ micDeviceId })}
          />
        ) : null}

        <div className="row">
          <button className="control" aria-pressed={settings.camera} onClick={() => void toggleCamera()}>
            <span className="control-label">Camera</span>
            <span className="control-value">{settings.camera ? 'On' : 'Off'}</span>
          </button>
          <button
            className="control-more"
            aria-label="Camera options"
            aria-expanded={openMenu === 'camera'}
            onClick={() => setOpenMenu(openMenu === 'camera' ? null : 'camera')}
          >
            •••
          </button>
        </div>
        {openMenu === 'camera' ? (
          <>
            <DeviceRow
              label="Camera"
              devices={cameras}
              value={settings.cameraDeviceId}
              onChange={(cameraDeviceId) => {
                updateSettings({ cameraDeviceId })
                if (settings.camera) void recordingEngine.openCamera(cameraDeviceId)
              }}
            />
            <div className="field">
              <label htmlFor="cam-shape">Shape</label>
              <select
                id="cam-shape"
                value={settings.cameraShape}
                onChange={(event) => updateSettings({ cameraShape: event.target.value as typeof settings.cameraShape })}
              >
                <option value="circle">Circle</option>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cam-position">Position</label>
              <select
                id="cam-position"
                value={settings.cameraPosition}
                onChange={(event) =>
                  updateSettings({ cameraPosition: event.target.value as typeof settings.cameraPosition })
                }
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cam-size">Size</label>
              <select
                id="cam-size"
                value={settings.cameraSize}
                onChange={(event) => updateSettings({ cameraSize: event.target.value as typeof settings.cameraSize })}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </>
        ) : null}

        <div className="divider" />

        <button className="btn btn-primary btn-block" onClick={start} disabled={starting}>
          {starting ? 'Waiting for the picker' : 'Start Recording'}
        </button>

        <p className="note">Your recordings stay on this device.</p>
      </div>
    </>
  )
}
