/**
 * Small IndexedDB wrapper for metadata only. Media itself lives in the origin
 * private file system, never in here.
 */

export interface SessionRecord {
  id: string
  name: string
  createdAt: number
  durationMs: number
  status: 'recording' | 'complete'
  mimeType: string
  screenFile: string
  cameraFile?: string
  bytes: number
  width: number
  height: number
  hasAudio: boolean
}

export interface ProjectRecord {
  sessionId: string
  updatedAt: number
  edits: unknown
}

const DB_NAME = 'recordly'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'sessionId' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
    })
  }
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const request = action(tx.objectStore(store))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
      }),
  )
}

export async function putSession(session: SessionRecord): Promise<void> {
  await run('sessions', 'readwrite', (store) => store.put(session))
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  return run<SessionRecord | undefined>('sessions', 'readonly', (store) => store.get(id))
}

export async function listSessions(): Promise<SessionRecord[]> {
  const all = await run<SessionRecord[]>('sessions', 'readonly', (store) => store.getAll())
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSession(id: string): Promise<void> {
  await run('sessions', 'readwrite', (store) => store.delete(id))
  await run('projects', 'readwrite', (store) => store.delete(id))
}

export async function putProject(record: ProjectRecord): Promise<void> {
  await run('projects', 'readwrite', (store) => store.put(record))
}

export async function getProject(sessionId: string): Promise<ProjectRecord | undefined> {
  return run<ProjectRecord | undefined>('projects', 'readonly', (store) => store.get(sessionId))
}

export async function readSetting<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>('settings', 'readonly', (store) => store.get(key))
}

export async function writeSetting<T>(key: string, value: T): Promise<void> {
  await run('settings', 'readwrite', (store) => store.put(value, key))
}
