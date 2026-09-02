import { useEffect, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { useApp } from '../../app/store'
import { capabilities } from '../../capabilities'
import { probeDiskWrites } from '../../storage/opfs/recordingStore'
import type { ThemeChoice } from '../../app/settings'
import type { QualityLevel } from '../../media/recording/quality'

export function SettingsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const settings = useApp((state) => state.settings)
  const updateSettings = useApp((state) => state.updateSettings)
  const caps = capabilities()
  const [diskWrites, setDiskWrites] = useState(true)

  useEffect(() => {
    if (open) void probeDiskWrites().then(setDiskWrites)
  }, [open])

  return (
    <Dialog
      open={open}
      title="Settings"
      onClose={onClose}
      footer={
        <button className="btn" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="field">
        <label htmlFor="theme">Theme</label>
        <select
          id="theme"
          value={settings.theme}
          onChange={(event) => updateSettings({ theme: event.target.value as ThemeChoice })}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="countdown">Countdown</label>
        <select
          id="countdown"
          value={settings.countdownSeconds}
          onChange={(event) => updateSettings({ countdownSeconds: Number(event.target.value) })}
        >
          <option value={0}>None</option>
          <option value={3}>3 seconds</option>
          <option value={5}>5 seconds</option>
          <option value={10}>10 seconds</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="quality">Quality</label>
        <select
          id="quality"
          value={settings.quality}
          onChange={(event) => updateSettings({ quality: event.target.value as QualityLevel })}
        >
          <option value="high">High</option>
          <option value="balanced">Balanced</option>
          <option value="small">Small file</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="framerate">Frame rate</label>
        <select
          id="framerate"
          value={settings.frameRate}
          onChange={(event) => updateSettings({ frameRate: Number(event.target.value) })}
        >
          <option value={24}>24 fps</option>
          <option value={30}>30 fps</option>
          <option value={60}>60 fps</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="autostop">Stop after</label>
        <select
          id="autostop"
          value={settings.maxDurationMinutes ?? 0}
          onChange={(event) =>
            updateSettings({ maxDurationMinutes: Number(event.target.value) || null })
          }
        >
          <option value={0}>No limit</option>
          <option value={5}>5 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="sysaudio">System audio</label>
        <input
          id="sysaudio"
          type="checkbox"
          checked={settings.systemAudio}
          onChange={(event) => updateSettings({ systemAudio: event.target.checked })}
        />
      </div>

      <p className="note">
        {diskWrites
          ? 'Recordings are written to local browser storage as they are captured.'
          : 'This browser keeps recordings in memory. Download them before closing the tab.'}
        {caps.systemAudioLikely ? '' : ' System audio may not be available here.'}
      </p>
    </Dialog>
  )
}
