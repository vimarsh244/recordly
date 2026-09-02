import { capabilities } from '../../capabilities'

/**
 * Writes one recording track to disk. Two implementations: the origin private
 * file system where it is available, and an in memory fallback. Callers do not
 * need to know which one they got.
 */
export interface TrackWriter {
  write(chunk: Blob): Promise<void>
  close(): Promise<number>
  bytesWritten(): number
}

/** How long one worker call may take before it is treated as lost. */
const CALL_TIMEOUT_MS = 8000

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
/** Set when the worker proves unusable, so later calls go straight to memory. */
let workerBroken = false

let createWorker = (): Worker => new Worker(new URL('./writer.worker.ts', import.meta.url), { type: 'module' })

/** Test seam. Production code never calls this. */
export function setWriterWorkerFactory(factory: () => Worker): void {
  createWorker = factory
  worker = null
  workerBroken = false
}

/**
 * Ends every waiting call. A worker that fails to load, or that dies, sends no
 * reply, and a call that waits for ever would hold up the start of a recording
 * behind a screen the user cannot leave.
 */
function breakWorker(reason: string) {
  workerBroken = true
  const waiting = [...pending.values()]
  pending.clear()
  try {
    worker?.terminate()
  } catch {
    // Already gone.
  }
  worker = null
  waiting.forEach((entry) => entry.reject(new Error(reason)))
}

function getWorker(): Worker {
  if (!worker) {
    worker = createWorker()
    worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const entry = pending.get(event.data.id)
      if (!entry) return
      pending.delete(event.data.id)
      if (event.data.ok) entry.resolve(event.data.result)
      else entry.reject(new Error(event.data.error ?? 'writer failed'))
    }
    worker.onerror = () => breakWorker('writer worker failed to run')
    worker.onmessageerror = () => breakWorker('writer worker sent a bad message')
  }
  return worker
}

function call(message: Record<string, unknown>, transfer: Transferable[] = []): Promise<unknown> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.delete(id)) return
      const reason = `writer timed out on ${String(message.type)}`
      breakWorker(reason)
      reject(new Error(reason))
    }, CALL_TIMEOUT_MS)
    const settle = {
      resolve: (value: unknown) => {
        clearTimeout(timer)
        resolve(value)
      },
      reject: (error: Error) => {
        clearTimeout(timer)
        reject(error)
      },
    }
    pending.set(id, settle)
    try {
      getWorker().postMessage({ ...message, id }, transfer)
    } catch (error) {
      pending.delete(id)
      settle.reject(error instanceof Error ? error : new Error('writer call failed'))
    }
  })
}

export function opfsAvailable(): boolean {
  return capabilities().opfs && !workerBroken
}

let syncProbe: Promise<boolean> | null = null

/**
 * Whether recordings can be streamed to disk. The answer only exists inside a
 * worker, so it is asked once and remembered.
 */
export function probeDiskWrites(): Promise<boolean> {
  if (!capabilities().opfs) return Promise.resolve(false)
  if (!syncProbe) syncProbe = call({ type: 'probe' }).then((value) => value === true).catch(() => false)
  return syncProbe
}

class OpfsWriter implements TrackWriter {
  private bytes = 0
  private queue: Promise<unknown> = Promise.resolve()

  constructor(private key: string) {}

  static async open(sessionId: string, fileName: string): Promise<OpfsWriter> {
    const key = `${sessionId}/${fileName}`
    await call({ type: 'open', key, sessionId, fileName })
    return new OpfsWriter(key)
  }

  async write(chunk: Blob): Promise<void> {
    this.bytes += chunk.size
    // Serialise writes so chunks land in order, and hand the buffer over
    // instead of copying it.
    this.queue = this.queue.then(async () => {
      const buffer = await chunk.arrayBuffer()
      return call({ type: 'write', key: this.key, buffer }, [buffer])
    })
    await this.queue
  }

  async close(): Promise<number> {
    await this.queue.catch(() => undefined)
    // A close that fails still leaves the chunks that did land on disk, and
    // those play. Never let it hold up the end of a recording.
    await call({ type: 'close', key: this.key }).catch(() => undefined)
    return this.bytes
  }

  bytesWritten(): number {
    return this.bytes
  }
}

class MemoryWriter implements TrackWriter {
  private parts: Blob[] = []
  private bytes = 0

  constructor(private onClose: (blob: Blob) => void, private mimeType: string) {}

  async write(chunk: Blob): Promise<void> {
    this.parts.push(chunk)
    this.bytes += chunk.size
  }

  async close(): Promise<number> {
    this.onClose(new Blob(this.parts, { type: this.mimeType }))
    this.parts = []
    return this.bytes
  }

  bytesWritten(): number {
    return this.bytes
  }
}

export async function openTrackWriter(
  sessionId: string,
  fileName: string,
  mimeType: string,
  onMemoryBlob: (blob: Blob) => void,
): Promise<TrackWriter> {
  if (opfsAvailable()) {
    try {
      return await OpfsWriter.open(sessionId, fileName)
    } catch {
      // Fall through to memory. A recording that works beats a tidy pipeline.
    }
  }
  return new MemoryWriter(onMemoryBlob, mimeType)
}

export async function readTrackFile(sessionId: string, fileName: string): Promise<File | null> {
  if (!capabilities().opfs) return null
  try {
    const root = await navigator.storage.getDirectory()
    const recordings = await root.getDirectoryHandle('recordings', { create: false })
    const dir = await recordings.getDirectoryHandle(sessionId, { create: false })
    const handle = await dir.getFileHandle(fileName, { create: false })
    return await handle.getFile()
  } catch {
    return null
  }
}

export async function deleteSessionFiles(sessionId: string): Promise<void> {
  if (!capabilities().opfs) return
  try {
    await call({ type: 'delete', sessionId })
  } catch {
    // Nothing to delete.
  }
}

export async function storageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!capabilities().storageEstimate) return null
  const estimate = await navigator.storage.estimate()
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
}
