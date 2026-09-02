import { deleteSession, listSessions, putSession, type SessionRecord } from '../../storage/indexeddb/db'
import { deleteSessionFiles, readTrackFile } from '../../storage/opfs/recordingStore'
import { containerFor } from '../../capabilities'
import type { Recording } from '../../media/recording/types'

/** Rebuilds a playable recording from what was written to disk. */
export async function loadRecording(session: SessionRecord): Promise<Recording | null> {
  const screen = await readTrackFile(session.id, session.screenFile)
  if (!screen || screen.size === 0) return null
  const camera = session.cameraFile ? await readTrackFile(session.id, session.cameraFile) : null

  return {
    sessionId: session.id,
    name: session.name,
    createdAt: session.createdAt,
    durationMs: session.durationMs,
    mimeType: session.mimeType,
    container: containerFor(session.mimeType),
    width: session.width,
    height: session.height,
    hasAudio: session.hasAudio,
    bytes: screen.size,
    persisted: true,
    screen: { blob: screen, url: URL.createObjectURL(screen), fileName: session.screenFile },
    camera:
      camera && camera.size > 0
        ? { blob: camera, url: URL.createObjectURL(camera), fileName: session.cameraFile! }
        : undefined,
  }
}

export async function loadSessionLists(): Promise<{ complete: SessionRecord[]; unfinished: SessionRecord[] }> {
  const sessions = await listSessions().catch(() => [] as SessionRecord[])
  return {
    complete: sessions.filter((session) => session.status === 'complete'),
    unfinished: sessions.filter((session) => session.status === 'recording'),
  }
}

export async function removeSession(id: string): Promise<void> {
  await deleteSessionFiles(id)
  await deleteSession(id).catch(() => undefined)
}

export async function renameSession(session: SessionRecord, name: string): Promise<void> {
  await putSession({ ...session, name }).catch(() => undefined)
}

/**
 * Marks an interrupted recording as usable. The file on disk holds every chunk
 * written before the page went away, so playback works even though the
 * container was never closed cleanly.
 */
export async function recoverSession(session: SessionRecord): Promise<Recording | null> {
  const file = await readTrackFile(session.id, session.screenFile)
  if (!file || file.size === 0) {
    await removeSession(session.id)
    return null
  }
  const recovered: SessionRecord = { ...session, status: 'complete', bytes: file.size }
  await putSession(recovered).catch(() => undefined)
  return loadRecording(recovered)
}
