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
export pipeline   browser codecs first, ffmpeg.wasm as the fallback
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

Export is the slowest thing Recordly does, so it has three paths. The cheapest
one that gives the right file wins. `src/media/export/plan.ts` makes that
choice. It is a pure function with unit tests.

```text
1  copy        The request changes nothing, so the recorded file is saved.
2  webcodecs   The browser encoders do the work, on the media hardware.
3  ffmpeg      FFmpeg compiled to WebAssembly, in software.
```

### 1. Copy

Nothing was edited and the format matches the recorded container. The file goes
straight to disk. No re-encode, no wait.

### 2. Browser codecs

`src/media/export/webcodecs.ts` drives WebCodecs through Mediabunny. Frames are
decoded and encoded by the same components the browser uses to play video, so
the graphics or media hardware does the work. This is between ten and fifty
times faster than software encoding, and it uses far less memory because no
frame ever passes through a virtual file system.

This path covers MP4, WebM and WAV, with trim, crop, resize, frame rate, mute
and volume. Speed changes go through it only when the output has no audio,
because changing the rate of audio without changing its pitch is a filter, not
a codec feature.

### 3. FFmpeg in WebAssembly

`src/media/ffmpeg/args.ts` turns edit state and export options into an ffmpeg
command, also a pure function with unit tests. `src/media/ffmpeg/client.ts`
loads the build and runs it in the worker the library creates.

This path handles GIF, MP3, speed changes with audio, and any file the browser
decoders refuse. If the browser accepts the fast path and then fails, this path
takes over on its own and the user presses nothing.

Two things keep it as quick as it can be:

- The multi threaded build runs whenever the page is cross origin isolated. See
  the next section. It gets one thread per core, less one for the interface.
- Progress is read from the encoder log, not from the container header. A file
  from MediaRecorder carries no duration, so the built in progress callback
  reports nothing and the panel used to sit on one frozen label.

Cancelling stops the conversion, or terminates the worker, and frees the memory.
The source recording is never touched by an export.

## Cross origin isolation

The multi threaded FFmpeg build needs `SharedArrayBuffer`, and a page only gets
that when it is cross origin isolated. That needs two response headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The dev and preview servers send them (`vite.config.ts`) and so does Vercel
(`vercel.json`). A host that sends neither leaves the page without isolation, so
`public/coi-serviceworker.js` adds them to this app's own responses. The page
skips the service worker entirely when the host already sends the headers.
It reloads the page once, on the first visit, because isolation starts at the
next navigation. Nothing leaves the device and no request is redirected. To turn
it off, set `recordly.coi` to `off` in local storage. Everything still works
without isolation, only more slowly.

Recordly loads no cross origin resource, so `require-corp` costs it nothing.

## Loading

The recorder is in the initial bundle. The Mediabunny module is about 175 kB
compressed and is fetched when the editor opens. The FFmpeg build is about
32 MB and is fetched only when the chosen settings actually need it, which most
exports do not.

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
    export/      engine choice, browser codec path
    ffmpeg/      command planning and WebAssembly client
  storage/
    opfs/        chunk writer worker and file access
    indexeddb/   metadata
  lib/           formatting helpers
  styles/        design tokens and layout
```
