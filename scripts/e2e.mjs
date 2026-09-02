// Records a short clip with fake capture devices, trims it, crops it and
// exports MP4 and GIF. Run it against a preview build: npm run build && npm run preview
import { chromium } from 'playwright'

const dir = process.env.RECORDLY_E2E_OUT ?? 'e2e-output'
await import('node:fs').then((fs) => fs.mkdirSync(dir, { recursive: true }))

const base = process.env.RECORDLY_URL ?? 'http://localhost:4173/'
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--auto-select-desktop-capture-source=Entire screen',
    '--auto-accept-this-tab-capture',
  ],
})
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['microphone', 'camera'] })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Mic Off' }).click()
await page.getByRole('button', { name: 'Start Recording' }).click()

await page.getByRole('button', { name: 'Stop' }).waitFor({ timeout: 20000 })
console.log('recording started')
await page.waitForTimeout(6000)
await page.screenshot({ path: `${dir}/recording.png` })
await page.getByRole('button', { name: 'Stop' }).click()

await page.getByRole('button', { name: 'Download', exact: true }).first().waitFor({ timeout: 20000 })
console.log('editor opened')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${dir}/editor.png` })

// Hovering the timeline shows a frame preview at that time.
const hover = await page.locator('.timeline').boundingBox()
await page.mouse.move(hover.x + hover.width * 0.5, hover.y + 25)
await page.locator('.tl-preview').waitFor({ timeout: 5000 })
await page.waitForTimeout(600)
await page.screenshot({ path: `${dir}/editor-scrub-preview.png` })

// Trim to the middle of the clip using the timeline handles.
const timeline = await page.locator('.timeline').boundingBox()
await page.mouse.move(timeline.x + 2, timeline.y + 25)
await page.mouse.down()
await page.mouse.move(timeline.x + timeline.width * 0.3, timeline.y + 25, { steps: 8 })
await page.mouse.up()
console.log('selection:', await page.locator('.meta').filter({ hasText: 'Selection' }).textContent())

await page.getByRole('tab', { name: 'Crop' }).click()
await page.selectOption('#aspect', { label: '1:1' })
await page.waitForTimeout(300)
await page.screenshot({ path: `${dir}/editor-crop.png` })

await page.getByRole('tab', { name: 'Export' }).click()
await page.selectOption('#export-format', 'mp4')
await page.selectOption('#export-resolution', '720')
const downloadPromise = page.waitForEvent('download', { timeout: 240000 })
await page.getByRole('button', { name: 'Export and download' }).click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${dir}/exporting.png` })
const download = await downloadPromise
const path = `${dir}/export.mp4`
await download.saveAs(path)
console.log('exported to', path)
await page.waitForTimeout(500)
await page.screenshot({ path: `${dir}/exported.png` })
// GIF used to go through the WebAssembly encoder, which took minutes. It now
// uses the browser decoder and the built in writer, so it has to be quick.
await page.selectOption('#export-format', 'gif')
await page.waitForTimeout(300)
const gifPromise = page.waitForEvent('download', { timeout: 240000 })
const gifStarted = Date.now()
await page.getByRole('button', { name: 'Export and download' }).click()
const gifDownload = await gifPromise
const gifPath = `${dir}/export.gif`
await gifDownload.saveAs(gifPath)
const gifBytes = await import('node:fs').then((fs) => fs.readFileSync(gifPath))
const gifHeader = gifBytes.subarray(0, 6).toString('latin1')
console.log(`exported ${gifPath}: ${gifHeader}, ${gifBytes.length} bytes in ${Date.now() - gifStarted} ms`)
if (gifHeader !== 'GIF89a' || gifBytes[gifBytes.length - 1] !== 0x3b) {
  throw new Error('The GIF is not a GIF.')
}

// The bytes are only a GIF if a real decoder says so, so hand them back to
// the browser and read the frames out again.
const gifCheck = await page.evaluate(async (base64) => {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  const decoder = new ImageDecoder({ data: bytes, type: 'image/gif' })
  await decoder.completed
  const first = await decoder.decode({ frameIndex: 0 })
  return {
    frames: decoder.tracks.selectedTrack.frameCount,
    width: first.image.displayWidth,
    height: first.image.displayHeight,
  }
}, gifBytes.toString('base64'))
console.log('gif decoded:', gifCheck)
if (gifCheck.frames < 2 || gifCheck.width < 2 || gifCheck.height < 2) {
  throw new Error('The GIF did not decode into frames.')
}
await page.waitForTimeout(500)
await page.screenshot({ path: `${dir}/exported-gif.png` })

console.log('errors:', errors)
await browser.close()
