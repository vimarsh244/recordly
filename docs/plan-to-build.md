# Recordly

Build **Recordly**, an open-source, privacy-first screen recorder and lightweight video editor that runs entirely inside the browser.

Recordly should provide many of the useful recording and editing capabilities found in tools such as:

- Cap
- Screenity
- Loom
- Screen Studio
- Tella
- CleanShot

These products should be treated as references for functionality and product quality only.

Do not copy their UI, branding, source code, layouts, wording, icons, or visual identity.

Recordly must have its own distinctive design and technical architecture.

The defining product idea is extremely simple:

> Open the website. Record in about 3 clicks. Edit if needed. Download.

There must be:

- No desktop application
- No installation
- No browser extension
- No account
- No login
- No backend
- No cloud processing
- No uploaded recordings
- No server-side FFmpeg
- No unnecessary onboarding
- No marketing funnel before the product

Everything should run locally on the user's device.

The homepage itself should essentially be the product.

---

# 1. Core Product Philosophy

Recordly should optimize for:

1. Simplicity
2. Performance
3. Privacy
4. Reliability
5. Useful functionality
6. Good design

It should support a large number of useful capabilities without visually exposing all of them at once.

A user should not feel like they are opening a professional video editor.

A user should feel like they opened a very good recording utility.

The application can internally contain 50 features while showing only 4 or 5 controls initially.

Use progressive disclosure aggressively.

Advanced functionality should appear only when:

- the user enables it
- the user opens an advanced menu
- the user enters the editor
- the feature becomes contextually relevant

Feature count must never directly determine interface complexity.

---

# 2. Absolute UX Requirement

A user opening Recordly for the first time should understand how to record within seconds.

The initial recording flow should require approximately 3 meaningful actions.

For example:

1. Click **Record**
2. Select a screen, application window, or browser tab from the native browser picker
3. Recording starts

Or:

1. Optionally toggle microphone or camera
2. Click **Record**
3. Select what to share

Do not create:

- onboarding screens
- setup wizards
- recording configuration pages
- mandatory quality selection
- mandatory device selection
- tutorial overlays before first use

Good defaults should handle almost everything.

The ideal reaction should be:

> Oh, I just click this.

---

# 3. Homepage Is the Product

Do not create a conventional SaaS landing page.

Do not create:

- giant hero sections
- product screenshots above the actual tool
- pricing sections
- testimonials
- fake user logos
- feature grids
- newsletter forms
- signup buttons
- "Get Started" funnels
- dashboard navigation
- sidebars
- fake statistics
- marketing fluff

The first viewport should essentially be Recordly itself.

A conceptual example:

```text
Recordly

Screen

Mic      On
Camera   Off

[ Start Recording ]

Your recordings stay on this device.
```

This is conceptual only.

Do not blindly reproduce this exact layout.

Design a genuinely polished interface around the same level of simplicity.

---

# 4. UI Must Not Look Like AI Slop

This is a major requirement.

The interface must not feel like something generated from a generic AI frontend prompt.

Avoid common AI-generated UI patterns such as:

- giant gradient hero headings
- purple and blue gradients
- random glowing orbs
- unnecessary glassmorphism
- frosted glass everywhere
- excessive blur effects
- huge rounded cards
- cards inside cards inside cards
- excessive pill-shaped controls
- giant border radii everywhere
- excessive shadows
- excessive animations
- decorative gradients with no purpose
- oversized headings
- massive empty hero sections
- fake testimonials
- fake companies
- fake metrics
- fake activity feeds
- fake avatars
- meaningless dashboard widgets
- excessive icon usage
- excessive badges
- tiny gray text everywhere
- random sparkle icons
- "AI-powered" styling
- generic startup illustrations
- decorative grid backgrounds
- needless glowing borders

Do not create UI simply because it looks impressive in a screenshot.

Every visual element must serve a functional purpose.

The application should feel designed by someone with taste and restraint.

The design should have:

- strong spacing
- intentional typography
- consistent sizing
- a restrained component system
- excellent alignment
- strong visual hierarchy
- subtle interactions
- clear states
- high information clarity

Prefer fewer, better-designed elements.

---

# 5. No Em Dashes

Do not use em dashes anywhere.

This applies to:

- UI copy
- headings
- tooltips
- documentation
- README content
- error messages
- generated text
- comments intended for users
- onboarding copy
- empty states

Use commas, periods, parentheses, colons, or normal hyphens where appropriate.

Do not use the character "—".

Avoid writing styles that commonly feel AI-generated.

Keep copy direct and natural.

For example:

Good:

```text
Your recording stays on this device.
```

Bad:

```text
Your recording stays private — always.
```

Good:

```text
Record your screen directly in your browser.
```

Bad:

```text
Effortless recording, reimagined for the modern web.
```

---

# 6. Copywriting Style

Product copy should be extremely concise.

Good:

```text
Start Recording
```

Good:

```text
Camera
```

Good:

```text
Mic
```

Good:

```text
Your recordings never leave your device.
```

Good:

```text
Exporting 47%
```

Bad:

```text
Unlock the power of seamless recording with a revolutionary privacy-first experience.
```

Bad:

```text
Capture your ideas with confidence and creativity.
```

Avoid startup language.

Avoid AI-generated marketing language.

Avoid filler.

The product should speak like a utility.

---

# 7. Visual Identity

Recordly should have a distinctive but restrained visual identity.

Explore an earthy visual direction.

Possible inspiration:

- warm cream
- parchment
- sand
- clay
- terracotta
- sage
- olive
- moss
- warm gray
- charcoal
- coffee brown

Do not make the entire application brown.

Earth tones should establish personality, not become a gimmick.

The final palette should have excellent contrast and accessibility.

---

# 8. Light Mode

Light mode should avoid pure clinical white everywhere.

Possible direction:

- warm off-white primary background
- charcoal text
- slightly warm borders
- clay or terracotta primary accent
- sage secondary states
- subtle surface differentiation

Keep the interface crisp.

Do not make it look vintage or rustic.

It should still feel like a modern software product.

---

# 9. Dark Mode

Dark mode should avoid generic blue-black SaaS styling.

Possible direction:

- warm near-black
- charcoal
- muted brown-gray surfaces
- softened white text
- restrained earthy accents

Support:

- Light
- Dark
- System

Persist theme locally.

---

# 10. Typography

Typography should feel intentional.

Use:

- clear hierarchy
- excellent legibility
- compact labels
- strong button text
- consistent line heights
- restrained font sizes

Avoid oversized landing-page typography.

The application is a tool, not a marketing site.

---

# 11. Recording Controls

The homepage should expose only the essential controls.

Primary controls:

- Screen
- Microphone
- Camera
- Start Recording

Optional secondary access:

- Settings
- GitHub
- Theme

Nothing else should compete with the Record button.

---

# 12. Screen Capture

Use browser-native APIs such as:

```js
navigator.mediaDevices.getDisplayMedia()
```

Allow the browser's native interface to select:

- Entire screen
- Application window
- Browser tab

Do not attempt to recreate or imitate the browser's screen picker.

Do not require a browser extension.

Do not inject scripts into another webpage.

---

# 13. Microphone

Provide a simple microphone toggle.

Example:

```text
Mic    On
```

Allow device selection through a small contextual menu.

Remember the selected microphone locally where practical.

Do not require selection before every recording.

Handle missing microphone permissions gracefully.

---

# 14. Camera

Provide a camera toggle.

Example:

```text
Camera    Off
```

When enabled:

- show camera preview
- allow camera selection
- allow camera overlay positioning
- allow basic overlay sizing
- allow basic overlay shape selection

Keep these controls secondary.

---

# 15. System Audio

Allow recording system or tab audio wherever supported.

Browser and operating system support differs.

Use feature detection.

Do not imply system audio works universally.

If unavailable, show a small clear message.

Example:

```text
System audio is not supported here.
```

The recording should still work.

---

# 16. Recording Modes

The interface does not need a dedicated mode selector.

Modes should emerge naturally from toggles.

Possible combinations:

- Screen only
- Screen + microphone
- Screen + camera
- Screen + microphone + camera
- Camera only

The default should remain screen recording.

---

# 17. Recording State

Once recording begins, simplify the interface.

Show only what is useful.

For example:

- Recording indicator
- Timer
- Pause
- Resume
- Microphone mute
- Camera state
- Stop

The active recording UI should be extremely compact.

---

# 18. Recording While Tab Is Inactive

This is essential.

Recording must continue when the Recordly tab is not active.

Users will often record:

- another browser tab
- another application
- a presentation
- their entire desktop

Architect the recording pipeline specifically for this.

Do not tie capture reliability to React rendering or animation frames in the Recordly tab.

---

# 19. Countdown

Support:

- None
- 3 seconds
- 5 seconds
- 10 seconds

Keep this in settings or a small contextual control.

Do not force users through another screen.

---

# 20. Timed Recording

Optionally support automatic stopping.

Examples:

- Stop after 5 minutes
- Stop after 15 minutes
- Stop after 30 minutes
- Custom duration

Useful for:

- presentations
- assignments
- product demos
- tutorials

Keep it optional.

---

# 21. Webcam Overlay

When enabled, camera should appear as a polished overlay.

Support:

- Circle
- Rounded rectangle
- Square if useful

Sizes:

- Small
- Medium
- Large

Positions:

- Bottom right
- Bottom left
- Top right
- Top left

If feasible:

- free positioning
- resizing by dragging

Potential styling:

- subtle border
- small shadow
- configurable padding
- mirrored camera preview

Do not over-design the camera overlay.

---

# 22. Separate Camera Source

Where practical, preserve the camera source separately instead of permanently baking it into screen capture.

This would allow the editor to later:

- move the camera
- resize the camera
- hide the camera
- change camera shape
- change camera crop
- change camera border

If preserving separate tracks significantly harms recording reliability, prioritize reliability first.

The architecture should still leave room for separate sources later.

---

# 23. Live Annotation

Take inspiration from Screenity and similar tools.

Potential live tools:

- Pen
- Highlighter
- Arrow
- Rectangle
- Circle

These tools should not be visible by default.

Reveal them only when annotation mode is opened.

The annotation toolbar should be compact.

---

# 24. Spotlight

Allow temporarily emphasizing part of the recording.

For example:

- spotlight circle
- spotlight rectangle
- dim rest of frame

This should be optional and lightweight.

---

# 25. Live Blur

If technically feasible, support blur regions while recording.

Possible uses:

- email addresses
- notifications
- account information
- personal details

If live blur creates performance or architectural problems, implement blur primarily in the editor.

Reliability is more important than checking off a feature.

---

# 26. Cursor Effects

Explore useful cursor features inspired by Cap, Screen Studio, and Screenity.

Potential features:

- Cursor emphasis
- Cursor highlight
- Click animation
- Cursor smoothing
- Larger cursor
- Hide cursor

However, Recordly must remain extension-free.

A normal webpage does not have unrestricted access to activity inside arbitrary captured applications or tabs.

Do not fake unavailable cursor metadata.

Implement these effects only if the necessary data can be captured reliably.

Otherwise provide editor-based alternatives where possible.

---

# 27. Push to Talk

Optionally support push-to-talk while the Recordly page has access to relevant keyboard events.

Do not claim support for global keyboard shortcuts unless the browser actually permits them.

Keep push-to-talk as an advanced feature.

---

# 28. Keyboard Shortcuts

Support useful shortcuts within browser limitations.

Examples:

- Pause
- Resume
- Stop
- Toggle mic
- Undo
- Redo
- Play/pause editor

Do not build core functionality around shortcuts that stop working when focus leaves the Recordly page.

---

# 29. After Recording

When recording ends, immediately display the result.

Do not automatically force the user into a complex editor.

Prioritize:

1. Preview
2. Download
3. Quick edit

Conceptually:

```text
[ Video Preview ]

[ Download ]

Trim   Crop   Audio   More
```

A user should be able to record and download without editing anything.

---

# 30. Editor Philosophy

The editor should answer:

> I recorded this. How can I quickly fix it?

It should not answer:

> How can I create a cinematic video production?

Recordly is not:

- Premiere Pro
- DaVinci Resolve
- Final Cut
- After Effects

The editor should feel closer to editing a screenshot than operating professional editing software.

---

# 31. Non-Destructive Editing

Where possible, keep editing non-destructive.

Represent edits as project state rather than rewriting the source immediately.

Example:

```ts
{
  trimStart,
  trimEnd,
  cuts,
  crop,
  zoomEvents,
  cameraPosition,
  background,
  blurRegions,
  annotations,
  audioSettings
}
```

Benefits:

- Undo
- Redo
- Faster editing
- Safer recovery
- Fewer re-encodes
- Better performance

Only render the final transformation during export where practical.

---

# 32. Timeline

Provide a simple timeline.

Support:

- Playhead
- Duration
- Current timestamp
- Trim handles
- Cut markers
- Optional thumbnails
- Optional waveform

Avoid presenting a complex multi-track editor unless separate tracks genuinely require one.

---

# 33. Trim

Trimming is a core feature.

Allow dragging handles to adjust:

- Start
- End

Preview immediately.

Avoid re-encoding during basic editing.

Where possible, perform efficient stream copy or equivalent techniques during final export when codec/container constraints allow it.

---

# 34. Cut

Allow users to remove parts from the middle.

Example:

```text
| keep | remove | keep |
```

The interaction should be simple:

1. Select region
2. Click Delete Section

Support undo.

---

# 35. Crop

Provide a visual crop interface.

Users should drag the crop area directly over the preview.

Presets:

- Free
- Original
- 16:9
- 16:10
- 4:3
- 1:1
- 9:16

Do not expose numeric coordinates by default.

---

# 36. Resize

Allow export resolutions such as:

- Original
- 2160p where appropriate
- 1440p
- 1080p
- 720p
- 480p

Do not upscale by default.

---

# 37. Canvas and Background

Take inspiration from products such as Cap and Screen Studio.

Allow the recording to sit inside a styled canvas.

Options:

- Solid color
- Subtle gradient
- Custom image
- Padding
- Rounded corners
- Shadow

Provide tasteful presets.

Do not make styled backgrounds part of the default recording.

The default should simply be the recording itself.

---

# 38. Background Framing

Allow something conceptually like:

```text
+-----------------------------+
|         background          |
|                             |
|   +---------------------+   |
|   |   recorded screen   |   |
|   +---------------------+   |
|                             |
+-----------------------------+
```

Controls might include:

- padding
- border radius
- shadow
- background

Keep the UI simple.

---

# 39. Zoom Effects

Allow manual zoom events in the editor.

A user should be able to:

1. Select a point in time
2. Add zoom
3. Select focus region
4. Set zoom amount

Animate zoom smoothly.

Later, explore:

- click-based zoom
- cursor-based zoom
- automatic zoom

Only implement automatic behavior if the required metadata exists reliably.

---

# 40. Blur Tool

Allow adding blur regions during editing.

Workflow:

1. Add blur
2. Draw rectangle
3. Set start and end times

Potential later feature:

- tracking blur region

Object tracking is not required initially.

---

# 41. Text Overlays

Allow simple text overlays.

Examples:

- short labels
- URLs
- keyboard shortcuts
- titles
- explanations

Keep formatting constrained.

Do not turn Recordly into Canva.

---

# 42. Shape Overlays

Support:

- Arrow
- Rectangle
- Circle
- Line

Useful for tutorials and demos.

---

# 43. Audio Controls

Provide basic audio controls.

At minimum:

- Mute
- Volume

If microphone and system audio remain separate:

- Microphone volume
- System volume
- Remove microphone
- Remove system audio

---

# 44. Audio Waveform

Where useful, generate a waveform asynchronously.

Do not block initial editor loading while generating it.

Waveform creation should happen in a worker or otherwise off the main thread where practical.

---

# 45. Silence Detection

Later, allow local detection of silent sections.

Potential feature:

```text
3 silent sections found
[ Review ]
```

Do not automatically modify the recording.

The user must approve removals.

---

# 46. Playback Speed

Support:

- 0.5x
- 0.75x
- 1x
- 1.25x
- 1.5x
- 2x

Potentially apply speed changes to specific sections.

---

# 47. Export

Export happens entirely on-device.

Default export experience should remain simple.

Example:

```text
Format   MP4
Quality  High

[ Export ]
```

Advanced settings stay hidden.

---

# 48. Export Formats

Where technically reliable, support:

- MP4
- WebM
- GIF
- WAV
- MP3 or another practical audio format

Prioritize MP4 because users expect it.

Do not list a format if it cannot be produced reliably in the current browser.

---

# 49. Export Quality

Provide user-friendly options:

- Original
- High
- Balanced
- Small

Advanced controls can optionally expose:

- Resolution
- Frame rate
- Bitrate
- Codec

Most users should never need these settings.

---

# 50. GIF Export

Allow exporting a selected section as a GIF.

Provide:

- start/end
- crop
- dimensions
- frame rate

Warn about large GIFs.

Use sensible defaults.

---

# 51. Audio Export

Allow extracting audio locally.

Possible formats:

- WAV
- MP3 if practical
- AAC if practical

---

# 52. Compression

Provide a simple video compression tool.

Presets:

- High quality
- Balanced
- Small file

Where practical, estimate final file size.

Do not expose raw codec settings unless Advanced is opened.

---

# 53. Performance Is a First-Class Product Requirement

Performance is one of the most important requirements in Recordly.

Do not treat performance as cleanup work after the features are implemented.

Performance should influence architecture from the beginning.

A screen recorder deals with:

- large video streams
- large audio streams
- long-running operations
- hundreds or thousands of video frames
- potentially gigabytes of temporary data
- CPU-heavy encoding
- memory-heavy decoding
- expensive canvas operations

Poor architectural choices will make the application unusable.

Design for performance first.

---

# 54. Main Thread Must Stay Responsive

The main browser thread should primarily handle:

- user interaction
- lightweight state updates
- rendering UI
- minimal coordination

Heavy media operations should not run directly on the main thread.

Move expensive work into:

- Web Workers
- dedicated workers
- OffscreenCanvas workers
- FFmpeg workers
- WebCodecs pipelines where applicable

The UI should remain interactive while:

- exporting
- converting
- generating thumbnails
- generating waveform
- cropping
- encoding
- decoding
- compressing
- generating GIFs

A progress bar that freezes is not acceptable.

---

# 55. Web Workers

Use Web Workers aggressively where they provide real value.

Potential worker responsibilities:

- FFmpeg
- waveform generation
- thumbnail extraction
- media analysis
- frame processing
- metadata extraction
- compression
- encoding
- export pipelines

Consider Comlink or a lightweight RPC abstraction if it improves architecture without creating unnecessary dependency overhead.

---

# 56. WebCodecs

Use WebCodecs where supported and where it meaningfully improves performance.

Potential uses:

- frame-level decoding
- encoding
- thumbnails
- transformations
- custom compositing
- efficient video pipelines

Prefer WebCodecs over FFmpeg WASM for operations where browser-native codecs provide a cleaner and faster solution.

Use capability detection.

Provide fallback behavior.

---

# 57. Hardware Acceleration

Take advantage of hardware-accelerated browser media pipelines whenever possible.

Do not unnecessarily convert media into formats that force everything through CPU-based WASM processing.

Prefer native:

- video decode
- video encode
- rendering
- compositing

when those paths use hardware acceleration and produce correct results.

---

# 58. WebGPU

Investigate WebGPU for tasks where GPU compute or rendering can produce a measurable benefit.

Potentially relevant use cases include:

- real-time blur
- background effects
- image filtering
- frame transformations
- compositing
- color processing
- certain effects
- accelerated preview rendering

However:

Do not use WebGPU simply because it exists.

Do not rewrite straightforward operations as GPU shaders if Canvas, WebGL, WebCodecs, CSS, or native video rendering is already faster, simpler, or more compatible.

WebGPU should be introduced only when profiling demonstrates that it materially helps.

Provide graceful fallback.

---

# 59. WebGL

For GPU-accelerated visual effects where WebGPU is not appropriate or support is insufficient, WebGL can be considered.

Possible uses:

- compositing
- filters
- transformations
- preview effects

Again, measure performance first.

Do not create unnecessary rendering infrastructure.

---

# 60. OffscreenCanvas

Use OffscreenCanvas where supported for expensive canvas-based operations.

Potential tasks:

- frame compositing
- camera overlays
- annotation rendering
- preview rendering
- thumbnails
- blur
- effects

Move this processing into workers where appropriate.

Avoid tying heavy canvas work to the main thread.

---

# 61. SharedArrayBuffer

Where architecture and deployment headers allow it safely, consider SharedArrayBuffer for high-performance communication between workers and media pipelines.

Use it only where measurable improvements justify the additional cross-origin isolation requirements.

Do not make the entire application dependent on SharedArrayBuffer if a simpler architecture performs sufficiently.

If used, configure required security headers correctly.

---

# 62. Avoid Unnecessary Data Copies

Large ArrayBuffer and Blob copies can destroy performance.

Use:

- Transferable objects
- structured cloning carefully
- shared memory when justified
- streaming APIs
- references instead of copies
- chunked processing

Avoid repeatedly copying complete videos between:

- React state
- workers
- FFmpeg
- IndexedDB
- preview components

Large media should not live inside React state.

---

# 63. React Performance

React should not be involved in frame processing.

Do not:

- put video frames into React state
- update React state at video frame rate
- store massive Blobs in global reactive stores
- trigger component trees every few milliseconds

Use React for interface state.

Use dedicated media systems for media processing.

Memoization should be applied where profiling demonstrates meaningful value.

Do not scatter `useMemo` and `useCallback` everywhere without reason.

---

# 64. Recording Architecture

Recording should not depend on frequent React renders.

Conceptually:

```text
Capture APIs
     ↓
Recording Engine
     ↓
Chunk Pipeline
     ↓
Local Storage
```

The React application should observe state such as:

```text
recording
paused
duration
storage usage
```

It should not sit inside the hot media path.

---

# 65. Chunked Recording

Do not store a 2-hour recording as one giant growing in-memory object.

Use MediaRecorder chunks or an equivalent streaming architecture.

Conceptually:

```text
MediaRecorder
      ↓
small chunks
      ↓
temporary local storage
      ↓
editor/project
```

Choose chunk duration based on profiling.

Avoid an excessive number of tiny writes.

Avoid giant chunks that increase recovery risk.

---

# 66. Origin Private File System

Investigate OPFS for large temporary recordings.

Where supported, OPFS may provide a better architecture than keeping long recordings in RAM or forcing everything into normal IndexedDB records.

Potential uses:

- recording chunks
- source media
- generated previews
- intermediate files
- export staging
- crash recovery

Use feature detection and fallbacks.

---

# 67. IndexedDB

Use IndexedDB where appropriate for:

- project metadata
- settings
- smaller blobs where reasonable
- recent recording metadata
- recovery indexes

Do not blindly store multi-gigabyte recordings in IndexedDB without understanding browser behavior and quotas.

---

# 68. Streaming

Prefer streaming processing where APIs allow it.

Do not require loading an entire file into memory before an operation starts if streaming is possible.

Explore:

- Streams API
- transferable streams where useful
- chunk-based reads
- chunk-based writes
- incremental encoding

---

# 69. FFmpeg WASM

FFmpeg WASM is useful, but it must not become the answer to every media problem.

Use it for operations where it provides clear value.

Examples:

- transcoding
- complex format conversion
- concatenation
- audio extraction
- certain filters
- GIF generation
- operations unavailable through native APIs

Do not automatically transcode everything through FFmpeg.

FFmpeg WASM can be:

- CPU intensive
- memory intensive
- slower than native codecs
- expensive to initialize

Use WebCodecs and native browser APIs where they provide better performance.

---

# 70. FFmpeg Loading

Do not make initial page load slow because a huge FFmpeg bundle is downloaded immediately.

Lazy-load heavy processing code.

The user should be able to open Recordly and begin recording quickly.

Load FFmpeg when:

- the user enters an operation that needs it
- the editor becomes likely to need it
- idle-time preloading makes sense

Do not block recording startup on FFmpeg initialization.

---

# 71. Code Splitting

Use aggressive but sensible code splitting.

Initial bundle should contain primarily:

- recorder UI
- capture logic
- essential controls

Load advanced code separately:

- FFmpeg
- advanced editor
- GIF encoder
- waveform engine
- WebGPU effects
- ML features
- background removal

Initial load should remain lightweight.

---

# 72. Lazy Loading

Lazy-load expensive modules.

Examples:

```text
Recorder Core
loaded immediately

Advanced Editor
loaded after recording

FFmpeg
loaded only when required

Background Removal
loaded only when enabled
```

Use browser idle time intelligently where helpful.

---

# 73. PWA Caching

If PWA support is added, cache appropriate heavy dependencies after initial use so later sessions are faster.

Do not introduce cache strategies that make deploying updates unreliable.

Version cached processing assets carefully.

---

# 74. Memory Management

Media applications can easily consume gigabytes of memory.

Pay close attention to:

- Blob lifetime
- ArrayBuffers
- object URLs
- ImageBitmap
- VideoFrame
- AudioData
- canvas buffers
- FFmpeg virtual file systems
- worker memory
- duplicate video copies

Explicitly release resources.

Examples:

- revoke Object URLs
- close VideoFrame instances
- close AudioData where appropriate
- terminate unused workers
- clear temporary buffers
- release media tracks
- clean FFmpeg temporary files

Do not assume garbage collection will solve poor architecture.

---

# 75. Avoid Full Media Duplication

Do not maintain:

- original video
- editor copy
- preview copy
- worker copy
- FFmpeg copy
- export copy

all simultaneously unless unavoidable.

Design around references, streams, chunks, or files.

---

# 76. Preview Performance

Editing preview should remain smooth.

Do not fully render production-quality export output for every frame during interactive editing.

Use lower-cost preview paths where reasonable.

The exported result can use higher quality.

For example:

- lower-resolution temporary compositing
- lightweight GPU preview effects
- cached thumbnails
- deferred high-quality rendering

The user should never have to wait several seconds after every trim handle movement.

---

# 77. Thumbnail Generation

Generate timeline thumbnails asynchronously.

Do not block editor startup.

Generate only the thumbnails necessary for the current timeline scale.

Cache them.

Do not decode hundreds of frames unnecessarily.

---

# 78. Waveform Generation

Generate audio waveform asynchronously.

Downsample aggressively for visualization.

There is no reason to keep millions of waveform samples just to draw a small timeline.

---

# 79. Background Processing

Operations such as:

- export
- encoding
- trimming
- cropping
- compression
- GIF generation
- waveform generation
- thumbnails

should continue if the Recordly tab becomes inactive, as far as the browser permits.

Use workers where possible.

Do not claim work can reliably continue after the Recordly tab is closed.

Browsers can terminate pages and workers.

Communicate this correctly.

---

# 80. Progress Reporting

Long operations should provide real progress where the underlying API permits it.

Do not fake progress bars.

If precise progress is unavailable, use an indeterminate state.

Example:

```text
Exporting
47%
```

or:

```text
Preparing export...
```

The UI must stay responsive.

---

# 81. Cancellation

Where practical, allow users to cancel expensive operations.

Examples:

- Export
- Compression
- GIF generation

Cancellation should:

- terminate unnecessary workers
- release buffers
- clean temporary files
- preserve the original recording

---

# 82. Performance Profiling

Do not guess about optimization.

Profile the application.

Measure:

- recording CPU usage
- recording memory usage
- dropped frames
- export speed
- editor responsiveness
- worker overhead
- FFmpeg startup time
- memory peaks
- OPFS performance
- thumbnail generation time
- waveform generation time

Use browser performance tooling.

Optimize actual bottlenecks.

---

# 83. Long Recording Testing

Test recordings of meaningful durations.

At minimum evaluate:

- 1 minute
- 10 minutes
- 30 minutes
- 60 minutes

Where possible test longer recordings.

Measure memory growth.

Memory should not grow linearly forever because old chunks remain unnecessarily retained in RAM.

---

# 84. Graceful Performance Degradation

Recordly should detect when an operation may be expensive.

Examples:

- 4K video
- 60 FPS recording
- multi-hour recording
- GIF export of long video
- expensive background removal

Provide sensible warnings.

Example:

```text
This export may use significant memory.

Try 1080p for faster processing.
```

Keep warnings concise.

---

# 85. Recording Recovery

Recording recovery is an important feature.

Persist chunks progressively where feasible.

If the page crashes or reloads, attempt to recover the recording.

On next load:

```text
Unfinished recording found.

[ Recover ]
[ Delete ]
```

Everything remains local.

---

# 86. Autosave

Autosave editing state locally.

Persist things such as:

- trim points
- cuts
- crop
- zooms
- camera position
- background
- annotations
- audio settings

Do not force users to manually save projects.

---

# 87. Data Safety

Never destroy the original recording because:

- export failed
- conversion failed
- editor crashed
- user changed format
- compression failed

Keep the original until:

- user explicitly deletes it
- user intentionally discards the project
- safe cleanup policy applies and is clearly communicated

---

# 88. Undo and Redo

Support Undo and Redo throughout editing.

Common keyboard shortcuts should work.

Editing should feel safe.

---

# 89. Recent Local Recordings

Optionally show recent recordings below the primary recorder.

For example:

```text
Recent

Product demo       04:32
Bug report          01:48
Presentation        12:04
```

Actions:

- Open
- Rename
- Download
- Delete

Everything stays local.

If there are no recent recordings, omit this section.

Do not turn it into a dashboard.

---

# 90. Offline Support

Once Recordly has loaded the necessary assets, significant functionality should ideally work offline.

Potential offline features:

- Record
- Preview
- Trim
- Crop
- Basic edit
- Export

Consider PWA support.

Installing the PWA must never be required.

---

# 91. No Accounts

Do not implement:

- signup
- login
- OAuth
- profile pages
- billing
- subscriptions
- organizations
- teams
- cloud projects

Recordly should work immediately.

---

# 92. No Backend

The core application should require no backend.

Do not create unnecessary:

- API routes
- Node servers
- databases
- job queues
- media servers
- authentication systems
- upload endpoints
- processing servers

The application should be statically deployable.

---

# 93. Recommended Technology Stack

Prefer:

- React
- TypeScript
- Vite

Potential technologies:

- Tailwind CSS or another lightweight styling system
- Zustand or similarly small state management
- MediaRecorder
- getDisplayMedia
- getUserMedia
- WebCodecs
- Web Workers
- OffscreenCanvas
- Web Audio API
- FFmpeg WASM
- OPFS
- IndexedDB
- Streams API
- WebGPU where genuinely useful
- WebGL where genuinely useful

Do not add technology simply because it sounds advanced.

Every dependency and browser API should have a purpose.

---

# 94. Why Vite

Prefer Vite over Next.js unless a concrete requirement emerges that genuinely needs Next.js.

Recordly:

- needs no SSR
- needs no backend
- needs no API routes
- needs no authentication
- should deploy as static files
- should have a simple contributor experience

Deploy to:

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages
- Any normal static hosting provider

---

# 95. Browser Support

Prioritize Chromium initially.

Suggested priority:

1. Chrome
2. Edge
3. Other Chromium browsers
4. Firefox
5. Safari

Use capability detection rather than browser-name assumptions wherever possible.

Different browsers support media APIs differently.

Gracefully disable unsupported features.

Do not break the entire recorder because one optional capability is unavailable.

---

# 96. Feature Detection

Build a central browser capability system.

Potential capabilities:

```ts
{
  screenCapture: true,
  systemAudio: true,
  webCodecs: true,
  webGPU: false,
  offscreenCanvas: true,
  opfs: true,
  sharedArrayBuffer: true
}
```

Use these capabilities to determine implementation paths.

Do not scatter random browser checks throughout the application.

---

# 97. Accessibility

Minimal does not mean inaccessible.

Support:

- Keyboard navigation
- Semantic HTML
- Accessible buttons
- Proper form labels
- Focus states
- Screen readers
- Contrast requirements
- Reduced motion
- Accessible dialogs
- Accessible menus

---

# 98. Responsive Design

Desktop should receive the full recording and editing experience.

Tablet should work reasonably well.

Mobile browser capture support may be limited.

Detect limitations and communicate them clearly.

Do not show controls that cannot function.

---

# 99. Architecture

Keep code modular.

A possible structure:

```text
src/
  app/
  components/

  features/
    recorder/
    microphone/
    camera/
    annotations/
    editor/
    timeline/
    crop/
    zoom/
    blur/
    export/
    recovery/

  media/
    capture/
    recording/
    codecs/
    compositing/
    audio/
    ffmpeg/
    webcodecs/
    webgpu/
    workers/

  storage/
    opfs/
    indexeddb/

  performance/
  capabilities/
  hooks/
  utils/
  styles/
```

This is directional.

Do not create abstraction purely for abstraction's sake.

---

# 100. Media Pipeline

Conceptually:

```text
Screen Capture
      │
      ├── Screen Video
      │
Microphone
      │
      ├── Mic Audio
      │
System Audio
      │
      ├── System Audio
      │
Camera
      │
      └── Camera Video
              │
              ▼
        Recording Engine
              │
              ▼
         Chunk Pipeline
              │
              ▼
        Local Storage
              │
              ▼
           Project
              │
              ▼
            Editor
              │
              ▼
        Export Pipeline
              │
              ▼
         Local Download
```

The actual architecture should be chosen after evaluating browser capabilities and performance.

---

# 101. Privacy

Privacy is part of the architecture.

Recordly should clearly state:

```text
Your recordings never leave your device.
```

Never upload:

- Screen video
- Webcam video
- Microphone audio
- System audio
- Frames
- File contents
- Exported recordings

No server should process media.

---

# 102. Analytics

Prefer no analytics initially.

If anonymous analytics are eventually added, never collect:

- recording contents
- screen contents
- file contents
- file names
- microphone data
- webcam data
- captured text
- exported files

Keep privacy easy to explain.

---

# 103. Error Handling

Handle browser and device failures carefully.

Permission cancelled:

```text
Screen access was cancelled.

[ Try Again ]
```

Microphone unavailable:

```text
Microphone unavailable.

You can still record without it.
```

Camera unavailable:

```text
Camera unavailable.
```

Export failure:

```text
Export failed.

Your original recording is safe.

[ Try Again ]
```

Never delete the user's source recording because an operation failed.

---

# 104. Feature Benchmark

Study the useful functionality provided by:

- Cap
- Screenity
- Screen Studio
- Loom
- Tella
- CleanShot

Potential features worth evaluating:

- Camera overlays
- Automatic zoom
- Manual zoom
- Cursor emphasis
- Click effects
- Cursor smoothing
- Background framing
- Trim
- Cut
- Crop
- Blur
- Live annotation
- Post-recording annotation
- Camera repositioning
- Recording recovery
- Countdown
- Auto-stop
- Mic controls
- System audio
- Audio controls
- Multiple export formats
- Compression
- GIF creation
- Local recording
- Offline operation
- Keyboard shortcuts
- Playback speed
- Camera backgrounds

Do not blindly copy their feature lists.

For every feature ask:

1. Is this useful?
2. Can it remain entirely local?
3. Is it technically possible without an extension?
4. Can it be performant?
5. Can it exist without cluttering the default UI?

If the answer is no, reconsider it.

---

# 105. Zero Extension Is Non-Negotiable

Some Screenity-style features are easier because Screenity is a browser extension.

Recordly is not.

Do not:

- inject scripts into captured websites
- require extension permissions
- require Chrome extension installation
- require native helpers
- require companion applications

If a feature cannot be implemented under normal browser security restrictions:

1. find a browser-native alternative
2. implement it during post-processing
3. leave it unsupported

Do not break the central product promise.

---

# 106. Simplicity Rule

The application may contain many features.

The homepage should still approximately feel like:

```text
Recordly

Screen

Mic       On
Camera    Off

[ Start Recording ]

Your recordings stay on this device.
```

Not:

```text
Codec
FPS
Bitrate
Resolution
Input
Output
Canvas
Cursor
Zoom
System Audio
Audio Codec
Video Codec
Compression
Container
Profile
Camera Border
Camera Radius
Background
```

Advanced controls belong behind contextually appropriate menus.

---

# 107. Defaults

Choose excellent defaults.

Users should not need to understand:

- codecs
- containers
- bitrate
- GOP size
- chroma subsampling
- FFmpeg
- WebCodecs
- encoding profiles

Default recording should simply look good and work.

---

# 108. Settings

Keep settings minimal.

Possible groups:

### Recording

- Default microphone
- Default camera
- Countdown
- Quality

### Appearance

- Light
- Dark
- System

### Advanced

- Preferred format
- Frame rate
- Codec
- Experimental features

A modal or popover may be enough.

Avoid an entire settings dashboard unless genuinely necessary.

---

# 109. Interaction Quality

Spend significant effort on interaction details.

Important areas:

- Start recording transition
- Recording indicator
- Timer
- Mic toggle states
- Camera preview
- Camera drag behavior
- Timeline handles
- Crop resizing
- Playback responsiveness
- Export feedback
- Keyboard navigation
- Error states
- Loading states
- Hover states
- Focus states

Animations should be subtle and fast.

Do not animate for decoration.

---

# 110. Performance Budgets

Establish practical performance goals during implementation.

Examples:

- Homepage becomes interactive quickly
- Recorder controls respond immediately
- Recording start is not blocked by loading editor dependencies
- Heavy processing does not freeze the interface
- Editor controls feel close to real-time
- Memory usage remains bounded during long recordings
- Export progress remains responsive
- Cancelling work releases resources

Use profiling rather than arbitrary assumptions to tune exact thresholds.

---

# 111. MVP

The initial public version should be small enough to ship but polished enough to use seriously.

## MVP Recording

Implement:

- Screen recording
- Window recording
- Browser tab recording
- Microphone
- Camera
- System/tab audio where supported
- Camera overlay
- Pause
- Resume
- Stop
- Timer
- Countdown
- Recording while Recordly tab is inactive

## MVP Post-Recording

Implement:

- Immediate preview
- Immediate download
- Rename recording
- Trim
- Crop
- Mute
- Volume adjustment
- Camera repositioning if architecture supports separate camera media

## MVP Export

Implement:

- WebM
- MP4 where reliable
- Original
- High
- Balanced
- Local download

## MVP Architecture

Implement correctly from the beginning:

- Worker-based heavy processing
- Chunked recording
- Local storage strategy
- Strong memory management
- Lazy-loaded FFmpeg
- WebCodecs where appropriate
- No backend
- Static deployment
- Recording recovery where feasible

## MVP UI

Implement:

- Homepage is recorder
- Approximately 3-click recording flow
- Minimal visible controls
- Light mode
- Dark mode
- Earthy visual identity
- No generic AI UI
- No marketing clutter
- No em dashes
- Responsive layout
- Accessible controls
- Excellent errors

---

# 112. Phase 2

After the recorder is extremely reliable:

- Cut timeline sections
- GIF export
- Audio export
- Compression
- Background framing
- Canvas customization
- Rounded screen corners
- Shadows
- Manual zoom
- Blur regions
- Text overlays
- Arrow annotations
- Shape annotations
- Timed auto-stop
- Recent local recordings
- Better crash recovery
- Offline PWA functionality
- Playback speed
- Separate mic/system audio controls

---

# 113. Phase 3

Explore only after profiling and validating the architecture:

- Automatic zoom
- Click-based zoom
- Cursor smoothing
- Cursor emphasis
- Click indicators
- Camera background blur
- Camera background removal
- Silence detection
- Silence removal
- Local subtitles
- Local speech-to-text
- Region tracking for blur
- More advanced annotation
- Automatic chapter detection

Any ML functionality should remain local.

Investigate GPU acceleration where useful.

Do not allow advanced features to compromise the lightweight core recorder.

---

# 114. README

The README should immediately explain the product.

Something like:

```text
# Recordly

Open-source screen recording directly in your browser.

No install.
No extension.
No account.
No upload.

Record, edit and export locally.
```

Follow with:

- screenshot or demo
- quick start
- supported browsers
- major features
- local development
- architecture
- privacy
- contribution instructions

Avoid a wall of marketing copy.

---

# 115. Open Source Quality

Treat Recordly as a serious open-source project.

Include:

- README.md
- CONTRIBUTING.md
- LICENSE
- architecture documentation
- development instructions
- browser compatibility documentation
- known limitations
- privacy explanation

Use a permissive license such as MIT or Apache 2.0 unless there is a specific reason not to.

Keep the repository approachable for contributors.

---

# 116. Final Product Standard

When someone opens Recordly, their reaction should be:

> Oh, I just click this.

When recording, they should forget Recordly is even there.

When recording finishes, their reaction should be:

> Nice, I can fix this quickly.

When exporting, the application should remain responsive.

When inspecting the project technically, it should be clear that performance and privacy were considered from the architecture stage rather than added later.

Recordly should combine:

- the immediacy of a tiny web utility
- the polish of a commercial application
- many useful capabilities inspired by Cap and Screenity
- the performance expected from a serious media application
- the privacy of a completely local tool
- the accessibility of a normal website
- a genuinely distinctive interface

The central workflow must always remain:

```text
Open Recordly
      ↓
Record
      ↓
Quick edit if necessary
      ↓
Download
```

No account.

No install.

No extension.

No upload.

No backend.

No AI-slop interface.

No unnecessary complexity.

No em dashes.

**Record. Edit. Export.**