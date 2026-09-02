import { useEffect, useState } from 'react'
import type { SessionRecord } from '../../storage/indexeddb/db'
import { formatBytes, formatDuration, safeFileName } from '../../lib/format'
import { loadRecording, loadSessionLists, removeSession, renameSession } from './sessions'
import { readTrackFile } from '../../storage/opfs/recordingStore'
import { useApp } from '../../app/store'

export function RecentRecordings({ reloadKey }: { reloadKey: number }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [renaming, setRenaming] = useState<string | null>(null)
  const openRecording = useApp((state) => state.openRecording)

  useEffect(() => {
    void loadSessionLists().then((lists) => setSessions(lists.complete))
  }, [reloadKey])

  if (sessions.length === 0) return null

  async function open(session: SessionRecord) {
    const recording = await loadRecording(session)
    if (recording) openRecording(recording)
  }

  async function download(session: SessionRecord) {
    const file = await readTrackFile(session.id, session.screenFile)
    if (!file) return
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeFileName(session.name)}.${session.screenFile.split('.').pop()}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <div className="panel" style={{ marginTop: 14 }}>
      <div className="panel-head">
        <span className="panel-title">Recent</span>
      </div>
      <div className="list">
        {sessions.map((session) => (
          <div className="list-item" key={session.id}>
            {renaming === session.id ? (
              <input
                type="text"
                autoFocus
                defaultValue={session.name}
                aria-label="Recording name"
                onBlur={async (event) => {
                  await renameSession(session, event.target.value.trim() || session.name)
                  setRenaming(null)
                  setSessions(await loadSessionLists().then((lists) => lists.complete))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') setRenaming(null)
                }}
              />
            ) : (
              <button className="btn btn-ghost btn-sm name" style={{ justifyContent: 'flex-start' }} onClick={() => void open(session)}>
                {session.name}
              </button>
            )}
            <span className="meta">{formatDuration(session.durationMs)}</span>
            <span className="meta">{formatBytes(session.bytes)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void download(session)}>
              Download
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(session.id)}>
              Rename
            </button>
            <button
              className="btn btn-ghost btn-sm btn-danger"
              onClick={async () => {
                await removeSession(session.id)
                setSessions((current) => current.filter((item) => item.id !== session.id))
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
