# Contributing

Thanks for helping. Recordly is a small static web app, so the setup is short.

## Setup

```bash
npm install
npm run dev
```

## Checks before a pull request

```bash
npm run lint    # TypeScript project build
npm test        # unit tests
npm run build   # production build
```

The browser test records a short clip with fake capture devices, trims it,
crops it and exports MP4:

```bash
npm run build
npm run preview          # in one terminal
npm run e2e              # in another
```

Set `CHROMIUM_PATH` if Playwright cannot find a browser.

## House rules

- No backend. No account. No upload. No browser extension.
- Do not use em dashes anywhere, in code, copy or documentation.
- Keep the first screen simple. New options belong behind a menu, a tab or the
  settings dialog.
- Heavy media work goes into a worker or an off main thread API. The React tree
  never touches frames or large buffers.
- Never delete a user recording because an operation failed.
- Check features with the capability layer in `src/capabilities`, not with
  browser name checks.

## Where things live

See [docs/architecture.md](docs/architecture.md) for the layer map.
