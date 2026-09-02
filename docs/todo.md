# Recordly build tracker

Checked items are built and working in the app. Everything else is open. The
full specification is in [plan-to-build.md](plan-to-build.md).

## MVP recording

- [x] Screen, window and browser tab capture through the native picker
- [x] Microphone, with device choice remembered
- [x] Camera, recorded as a separate file so it can be moved later
- [x] Camera preview with shape, size and corner position
- [x] System or tab audio where the browser supports it
- [x] Mixed audio track with mute that keeps the timeline aligned
- [x] Countdown of none, 3, 5 or 10 seconds
- [x] Pause, resume and stop
- [x] Timer that stays correct while the tab is in the background
- [x] Recording continues while the Recordly tab is inactive
- [x] Automatic stop after a chosen duration
- [x] Stop from the browser's own sharing control
- [ ] Free camera positioning by dragging the preview
- [ ] Push to talk while the page has focus
- [ ] Live annotation tools (pen, arrow, rectangle, highlight)
- [ ] Spotlight and live blur

## MVP after recording

- [x] Immediate preview
- [x] Rename
- [x] Download the original without re-encoding
- [x] Trim with timeline handles and keyboard
- [x] Crop with a visual box and aspect presets
- [x] Mute and volume
- [x] Playback speed from 0.5x to 2x
- [x] Undo and redo, including keyboard shortcuts
- [x] Edits saved automatically
- [ ] Cut sections out of the middle
- [ ] Camera repositioning applied to the export
- [ ] Timeline thumbnails
- [ ] Audio waveform generated in a worker
- [ ] Separate microphone and system audio levels

## MVP export

- [x] MP4, WebM, GIF, MP3 and WAV
- [x] Quality presets: high, balanced, small file
- [x] Resolution choice down to 480p
- [x] Real progress, read from the encoder, with elapsed and remaining time
- [x] Cancel that frees memory and keeps the original safe
- [x] Stream copy when there is nothing to change
- [x] Warnings for long GIFs and very large frames
- [ ] Estimated output size before export
- [ ] Advanced settings for codec, frame rate and bitrate

## Architecture

- [x] Recording engine outside the React render path
- [x] Chunked recording, 3 second chunks
- [x] Chunks written to the origin private file system from a worker
- [x] Memory fallback when disk writes are not available
- [x] Metadata in IndexedDB, media never in IndexedDB
- [x] Recovery of an unfinished recording after a crash or reload
- [x] ffmpeg.wasm loaded on demand, and only when the settings need it
- [x] Export runs in a worker and continues while the tab is hidden
- [x] Central capability detection, no browser name checks
- [x] Static build with no backend
- [x] WebCodecs export path, with the WebAssembly encoder as the fallback
- [x] Multi threaded ffmpeg.wasm, with cross origin isolation from a service worker
- [ ] WebCodecs path for timeline thumbnails
- [ ] OffscreenCanvas compositing for camera and effects at export time
- [ ] Memory and speed profiling for 30 and 60 minute recordings
- [ ] Storage usage and quota shown in the interface

## Interface

- [x] The homepage is the recorder
- [x] Recording starts in about three actions
- [x] Light, dark and system themes, stored locally
- [x] Earthy palette with real contrast
- [x] Compact recording bar
- [x] Recent recordings with open, rename, download and delete
- [x] Clear errors that never lose the recording
- [x] Keyboard access for the timeline handles and the editor
- [ ] Full accessibility pass with a screen reader
- [ ] Tablet layout review

## Phase 2

- [ ] Background framing: padding, rounded corners, shadow, colours
- [ ] Manual zoom events
- [ ] Blur regions in the editor
- [ ] Text overlays
- [ ] Arrow, rectangle, circle and line overlays
- [ ] Compression tool with size estimates
- [ ] Offline support as an optional PWA

## Phase 3

- [ ] Cursor emphasis and click effects, only if the data is real
- [ ] Camera background blur or removal, running locally
- [ ] Silence detection with user approval
- [ ] Local subtitles
- [ ] Automatic zoom driven by measured data
