import { expect, it, vi } from 'vitest'

vi.stubGlobal('navigator', { storage: { getDirectory: () => Promise.resolve({}) } })

const { openTrackWriter, setWriterWorkerFactory } = await import('../recordingStore')

/** A worker that takes messages and never answers. */
class SilentWorker {
  onmessage: unknown = null
  onerror: unknown = null
  onmessageerror: unknown = null
  postMessage() {}
  terminate() {}
}

/** A worker that fails the way a script that cannot load does. */
class BrokenWorker extends SilentWorker {
  constructor() {
    super()
    queueMicrotask(() => (this.onerror as (() => void) | null)?.())
  }
}

it('falls back to memory when the writer worker never answers', async () => {
  setWriterWorkerFactory(() => new SilentWorker() as unknown as Worker)
  vi.useFakeTimers()
  try {
    let saved: Blob | null = null
    const opening = openTrackWriter('session', 'screen.webm', 'video/webm', (blob) => (saved = blob))
    await vi.advanceTimersByTimeAsync(9000)
    const writer = await opening
    await writer.write(new Blob(['abc']))
    expect(await writer.close()).toBe(3)
    expect(saved).not.toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

it('stops using the worker once it has proved broken', async () => {
  setWriterWorkerFactory(() => new BrokenWorker() as unknown as Worker)
  let saved: Blob | null = null
  const first = await openTrackWriter('session', 'screen.webm', 'video/webm', (blob) => (saved = blob))
  await first.write(new Blob(['ab']))
  expect(await first.close()).toBe(2)
  expect(saved).not.toBeNull()

  // The second track opens with no wait at all, because the worker is out.
  const started = Date.now()
  await openTrackWriter('session', 'camera.webm', 'video/webm', () => undefined)
  expect(Date.now() - started).toBeLessThan(500)
})
