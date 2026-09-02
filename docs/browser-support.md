# Browser support

Recordly uses capability detection, not browser names. Features turn off when
the browser cannot do them, and the recorder keeps working.

| Capability | Chrome and Edge | Firefox | Safari |
| --- | --- | --- | --- |
| Screen, window and tab capture | Yes | Yes | Yes |
| System or tab audio | Tab and screen audio | Not supported | Not supported |
| Recording to disk while capturing | Yes | Yes | Yes |
| WebM recording | Yes | Yes | No, records MP4 |
| Camera as a separate file | Yes | Yes | Yes |
| Export with ffmpeg.wasm | Yes | Yes | Yes, slower |

Notes:

- Desktop only in practice. Mobile browsers do not offer screen capture, and the
  recorder says so instead of showing controls that cannot work.
- System audio depends on the operating system and on what the user picks in the
  browser share dialog. If there is no audio track, Recordly records without it.
- Safari records MP4 rather than WebM. Export handles both.
- When a browser cannot write to the origin private file system, recordings are
  held in memory. Long recordings are then limited by available memory.
