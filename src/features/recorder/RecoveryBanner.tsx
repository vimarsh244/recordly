import { useEffect, useState } from 'react'
import type { SessionRecord } from '../../storage/indexeddb/db'
import { useApp } from '../../app/store'
import { loadSessionLists, recoverSession, removeSession } from './sessions'

export function RecoveryBanner({ onResolved }: { onResolved(): void }) {
  const [session, setSession] = useState<SessionRecord | null>(null)
  const openRecording = useApp((state) => state.openRecording)

  useEffect(() => {
    void loadSessionLists().then((lists) => setSession(lists.unfinished[0] ?? null))
  }, [])

  if (!session) return null

  return (
    <div className="banner" role="status">
      <span className="msg">Unfinished recording found.</span>
      <button
        className="btn btn-sm"
        onClick={async () => {
          const recording = await recoverSession(session)
          setSession(null)
          onResolved()
          if (recording) openRecording(recording)
        }}
      >
        Recover
      </button>
      <button
        className="btn btn-sm btn-danger"
        onClick={async () => {
          await removeSession(session.id)
          setSession(null)
          onResolved()
        }}
      >
        Delete
      </button>
    </div>
  )
}
