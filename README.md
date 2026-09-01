# Recordly

Open source screen recording directly in your browser.

No install.
No extension.
No account.
No upload.

Record, edit and export locally.

## What it does

- Records a screen, an application window or a browser tab
- Adds microphone audio, system or tab audio where the browser allows it
- Adds a camera, recorded as its own file so it can be moved later
- Keeps recording while the Recordly tab sits in the background
- Countdown, pause, resume and an optional automatic stop
- Preview, rename and download as soon as you stop
- Trim, crop, mute, volume and playback speed in a small editor
- Export to MP4, WebM, GIF, MP3 or WAV, all on your machine

## Quick start

```bash
npm install
npm run dev
```

Open the address the terminal prints, then press Start Recording. The browser
asks what to share. That is the whole flow.

To build the static site:

```bash
npm run build
npm run preview
```

The output in `dist/` is plain static files. It runs on Cloudflare Pages,
Netlify, Vercel, GitHub Pages or any web server.

## Supported browsers

Chrome and Edge get the full experience. See
[docs/browser-support.md](docs/browser-support.md) for the details and for what
is missing in Firefox and Safari.

## How it works

Capture, storage and export are separate layers, and none of them run on the
React render path. See [docs/architecture.md](docs/architecture.md).

## Privacy

Recordings never leave the device. There is no backend, no analytics and no
upload path in the code. See [docs/privacy.md](docs/privacy.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The build plan lives in
[docs/plan-to-build.md](docs/plan-to-build.md) and the current state of the work
is tracked in [docs/todo.md](docs/todo.md).

## License

MIT. See [LICENSE](LICENSE).
