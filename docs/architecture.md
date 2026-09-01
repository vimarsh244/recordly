# Architecture

Recordly is a static React app. Everything runs in the browser. There is no
server, no API and no upload.

## Layers

```text
capture APIs      getDisplayMedia, getUserMedia
      |
recording engine  src/media/recording/engine.ts
      |
chunk pipeline    MediaRecorder chunks every 3 seconds
      |
local storage     origin private file system, written from a worker
      |
project           metadata in IndexedDB, edits kept as state
      |
editor            preview, trim, crop, audio, speed
      |
export pipeline   ffmpeg.wasm in its own worker
      |
local download
```

## Recording engine

`src/media/recording/engine.ts` is plain TypeScript with a subscribe callback.
React reads it through `useSyncExternalStore` and never sits inside the capture
path. There is no animation frame loop and no canvas compositing during
recording, so a hidden or throttled tab keeps recording correctly.

The elapsed time is computed from timestamps rather than counted by a timer, so
background throttling cannot make the clock drift.

## Audio

Microphone and system audio are mixed with the Web Audio API into one track
(`src/media/audio/mixer.ts`). Web Audio runs on its own thread. Muting sets a
gain to zero rather than stopping the track, which keeps audio and video
aligned.

## Camera

The camera is recorded by a second MediaRecorder into its own file. Nothing is
baked into the screen video, so the editor can move, resize or hide the camera
later. This also avoids per frame canvas work during capture, which is the part
that breaks when a tab is hidden.

## Storage

Chunks are written by `src/storage/opfs/writer.worker.ts` using synchronous
access handles, which exist only inside workers. That keeps large writes off the
main thread. If the origin private file system is not usable, the writer falls
back to memory and the editor says so.

Only metadata goes into IndexedDB: session name, duration, size, file names and
saved edit state. Media never goes in there.

A session is marked `recording` when it starts and `complete` when it ends. A
session still marked `recording` on the next load is offered for recovery,
because every chunk written before the page went away is already on disk.

## Editing

Edits are state, not new files:

```ts
{ trimStart, trimEnd, crop, muted, volume, speed }
```

The preview applies them with the video element and CSS. Nothing is re-encoded
until export. Undo and redo work on this state, and it is saved to IndexedDB as
you go.

## Export

`src/media/ffmpeg/args.ts` turns edit state and export options into an ffmpeg
command. It is a pure function with unit tests. `src/media/ffmpeg/client.ts`
loads ffmpeg.wasm on demand and runs it in the worker the library creates, so
the interface stays responsive and export continues while the tab is in the
background.

When nothing was edited and the format matches the recorded container, the
original file is saved directly. No re-encode, no wait.

Cancelling terminates the worker and frees its memory. The source recording is
never touched by an export.

## Loading

The recorder is in the initial bundle. ffmpeg.wasm is about 32 MB and is fetched
only when the editor is open or an export starts. Opening Recordly never waits
for it.

## Folder map

```text
src/
  app/           settings, theme, store
  capabilities/  one place for feature detection
  components/    small shared UI pieces
  features/
    recorder/    the first screen
    editor/      preview, timeline, crop, export panel
    project/     edit state types
  media/
    capture/     getDisplayMedia and getUserMedia wrappers
    audio/       mixing
    recording/   engine, quality, types
    ffmpeg/      export planning and client
  storage/
    opfs/        chunk writer worker and file access
    indexeddb/   metadata
  lib/           formatting helpers
  styles/        design tokens and layout
```
