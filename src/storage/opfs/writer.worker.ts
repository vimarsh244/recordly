/// <reference lib="webworker" />
/**
 * Appends recording chunks to files in the origin private file system.
 * Runs in a worker because the synchronous access handle API, which is the
 * fast path for many small appends, is worker only. Keeping this off the main
 * thread is what lets recording survive a busy or hidden page.
 */

type OpenMessage = { id: number; type: 'open'; key: string; sessionId: string; fileName: string }
type WriteMessage = { id: number; type: 'write'; key: string; buffer: ArrayBuffer }
type CloseMessage = { id: number; type: 'close'; key: string }
type DeleteMessage = { id: number; type: 'delete'; sessionId: string }
type ProbeMessage = { id: number; type: 'probe' }
type Incoming = OpenMessage | WriteMessage | CloseMessage | DeleteMessage | ProbeMessage

interface OpenFile {
  handle: FileSystemSyncAccessHandle
  offset: number
}

const files = new Map<string, OpenFile>()

async function sessionDir(sessionId: string, create: boolean) {
  const root = await navigator.storage.getDirectory()
  const recordings = await root.getDirectoryHandle('recordings', { create })
  return recordings.getDirectoryHandle(sessionId, { create })
}

async function open(message: OpenMessage) {
  const dir = await sessionDir(message.sessionId, true)
  const fileHandle = await dir.getFileHandle(message.fileName, { create: true })
  const handle = await fileHandle.createSyncAccessHandle()
  handle.truncate(0)
  files.set(message.key, { handle, offset: 0 })
}

function write(message: WriteMessage): number {
  const file = files.get(message.key)
  if (!file) throw new Error('write before open')
  const view = new Uint8Array(message.buffer)
  file.handle.write(view, { at: file.offset })
  file.offset += view.byteLength
  return file.offset
}

function close(message: CloseMessage): number {
  const file = files.get(message.key)
  if (!file) return 0
  file.handle.flush()
  file.handle.close()
  files.delete(message.key)
  return file.offset
}

async function remove(message: DeleteMessage) {
  const root = await navigator.storage.getDirectory()
  const recordings = await root.getDirectoryHandle('recordings', { create: false })
  await recordings.removeEntry(message.sessionId, { recursive: true })
}

/**
 * Synchronous access handles exist only inside workers, so support cannot be
 * checked from the page. This opens a scratch file and reports what happened.
 */
async function probe(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle('.probe', { create: true })
    const handle = await fileHandle.createSyncAccessHandle()
    handle.close()
    await root.removeEntry('.probe').catch(() => undefined)
    return true
  } catch {
    return false
  }
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const message = event.data
  try {
    let result: unknown
    switch (message.type) {
      case 'open':
        await open(message)
        break
      case 'write':
        result = write(message)
        break
      case 'close':
        result = close(message)
        break
      case 'delete':
        await remove(message)
        break
      case 'probe':
        result = await probe()
        break
    }
    self.postMessage({ id: message.id, ok: true, result })
  } catch (error) {
    self.postMessage({ id: message.id, ok: false, error: String(error) })
  }
}
