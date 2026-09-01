# Privacy

Your recordings stay on this device.

- No account, no login, no server.
- No upload endpoint exists in the code.
- Screen video, camera video, microphone audio and system audio are captured,
  stored and exported on your machine.
- Editing and export run in your browser with WebAssembly. No media is sent
  anywhere for processing.
- No analytics, no tracking, no third party scripts at runtime.

## What is stored on your device

- Recording files in the origin private file system of your browser. Other
  websites cannot read them.
- Recording metadata and saved edits in IndexedDB: name, duration, size, file
  names, trim and crop values.
- Settings in local storage: theme, quality, countdown, chosen devices.

Deleting a recording in the Recent list removes the files and the metadata. You
can also clear site data in your browser to remove everything.

## Limits worth knowing

- If a browser cannot use the origin private file system, the recording is kept
  in memory. The app says so, and you should download it before closing the tab.
- Browsers can stop pages and workers. Work can continue while the tab is in the
  background, but nothing can continue after the tab is closed.
