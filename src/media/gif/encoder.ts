/**
 * A GIF writer in plain TypeScript.
 *
 * Recordly used to make GIFs with FFmpeg in WebAssembly. That build decodes
 * the video in software and runs a two pass palette filter, which is why a
 * short clip took minutes. The browser can decode the video on its hardware,
 * so the only part left to do here is the part no browser does for us: reduce
 * each frame to 256 colours and pack it with LZW. Both are cheap.
 *
 * Nothing in this file touches the DOM, so all of it is testable.
 */

/** Bits per channel in the colour histogram. Five gives 32768 buckets. */
const BITS = 5
const SIDE = 1 << BITS
const BUCKETS = SIDE * SIDE * SIDE

/** Bucket for one colour, from the top five bits of each channel. */
function bucketOf(r: number, g: number, b: number): number {
  return ((r >> 3) << (BITS * 2)) | ((g >> 3) << BITS) | (b >> 3)
}

interface Box {
  r0: number
  r1: number
  g0: number
  g1: number
  b0: number
  b1: number
  count: number
}

/** A colour histogram that several frames can be added to. */
export class ColorHistogram {
  readonly counts = new Uint32Array(BUCKETS)
  private readonly sumR = new Float64Array(BUCKETS)
  private readonly sumG = new Float64Array(BUCKETS)
  private readonly sumB = new Float64Array(BUCKETS)

  /**
   * Adds the pixels of one RGBA frame.
   *
   * @param step Take one pixel out of every `step`. A frame holds far more
   *   pixels than the palette needs, so a sample gives the same palette for a
   *   fraction of the work.
   */
  add(rgba: Uint8Array | Uint8ClampedArray, step = 1): void {
    const stride = Math.max(1, Math.floor(step)) * 4
    for (let i = 0; i + 3 < rgba.length; i += stride) {
      const r = rgba[i]
      const g = rgba[i + 1]
      const b = rgba[i + 2]
      const bucket = bucketOf(r, g, b)
      this.counts[bucket]++
      this.sumR[bucket] += r
      this.sumG[bucket] += g
      this.sumB[bucket] += b
    }
  }

  /** True when no pixel has been added yet. */
  get empty(): boolean {
    for (let i = 0; i < BUCKETS; i++) if (this.counts[i] !== 0) return false
    return true
  }

  /**
   * Median cut. Splits the colour cube until there are `maxColors` boxes, then
   * takes the average colour of each box. This is the same idea as the
   * `palettegen` filter of FFmpeg, only over a coarser cube.
   *
   * @returns RGB triplets, three bytes per colour.
   */
  palette(maxColors: number): Uint8Array {
    const limit = Math.max(2, Math.min(255, Math.floor(maxColors)))
    const first = this.tighten({ r0: 0, r1: SIDE - 1, g0: 0, g1: SIDE - 1, b0: 0, b1: SIDE - 1, count: 0 })
    if (!first) return new Uint8Array([0, 0, 0, 255, 255, 255])

    const boxes: Box[] = [first]
    while (boxes.length < limit) {
      const box = this.pickBox(boxes)
      if (!box) break
      const halves = this.split(box)
      if (!halves) break
      boxes.splice(boxes.indexOf(box), 1, halves[0], halves[1])
    }

    const palette = new Uint8Array(boxes.length * 3)
    boxes.forEach((box, index) => {
      let count = 0
      let r = 0
      let g = 0
      let b = 0
      for (let ri = box.r0; ri <= box.r1; ri++) {
        for (let gi = box.g0; gi <= box.g1; gi++) {
          const base = (ri << (BITS * 2)) | (gi << BITS)
          for (let bi = box.b0; bi <= box.b1; bi++) {
            const bucket = base | bi
            const weight = this.counts[bucket]
            if (weight === 0) continue
            count += weight
            r += this.sumR[bucket]
            g += this.sumG[bucket]
            b += this.sumB[bucket]
          }
        }
      }
      const at = index * 3
      if (count === 0) return
      palette[at] = Math.round(r / count)
      palette[at + 1] = Math.round(g / count)
      palette[at + 2] = Math.round(b / count)
    })
    return palette
  }

  /** The box worth splitting: the one holding the most pixels. */
  private pickBox(boxes: Box[]): Box | null {
    let best: Box | null = null
    for (const box of boxes) {
      const splittable = box.r1 > box.r0 || box.g1 > box.g0 || box.b1 > box.b0
      if (!splittable) continue
      if (!best || box.count > best.count) best = box
    }
    return best
  }

  /** Shrinks a box to the buckets that hold pixels. Null when it holds none. */
  private tighten(box: Box): Box | null {
    let r0 = SIDE
    let r1 = -1
    let g0 = SIDE
    let g1 = -1
    let b0 = SIDE
    let b1 = -1
    let count = 0
    for (let r = box.r0; r <= box.r1; r++) {
      for (let g = box.g0; g <= box.g1; g++) {
        const base = (r << (BITS * 2)) | (g << BITS)
        for (let b = box.b0; b <= box.b1; b++) {
          const weight = this.counts[base | b]
          if (weight === 0) continue
          count += weight
          if (r < r0) r0 = r
          if (r > r1) r1 = r
          if (g < g0) g0 = g
          if (g > g1) g1 = g
          if (b < b0) b0 = b
          if (b > b1) b1 = b
        }
      }
    }
    if (count === 0) return null
    return { r0, r1, g0, g1, b0, b1, count }
  }

  /** Cuts a box in two across its longest side, at the middle of its pixels. */
  private split(box: Box): [Box, Box] | null {
    const spanR = box.r1 - box.r0
    const spanG = box.g1 - box.g0
    const spanB = box.b1 - box.b0
    const axis = spanG >= spanR && spanG >= spanB ? 'g' : spanR >= spanB ? 'r' : 'b'
    const from = axis === 'r' ? box.r0 : axis === 'g' ? box.g0 : box.b0
    const to = axis === 'r' ? box.r1 : axis === 'g' ? box.g1 : box.b1
    if (to <= from) return null

    // Walk the axis until half of the pixels are behind us.
    const half = box.count / 2
    let seen = 0
    let cut = from
    for (let slice = from; slice < to; slice++) {
      seen += this.sliceCount(box, axis, slice)
      cut = slice
      if (seen >= half) break
    }

    const low = { ...box }
    const high = { ...box }
    if (axis === 'r') {
      low.r1 = cut
      high.r0 = cut + 1
    } else if (axis === 'g') {
      low.g1 = cut
      high.g0 = cut + 1
    } else {
      low.b1 = cut
      high.b0 = cut + 1
    }
    const tightLow = this.tighten(low)
    const tightHigh = this.tighten(high)
    if (!tightLow || !tightHigh) return null
    return [tightLow, tightHigh]
  }

  /** Pixels in one plane of a box. */
  private sliceCount(box: Box, axis: 'r' | 'g' | 'b', slice: number): number {
    let total = 0
    const r0 = axis === 'r' ? slice : box.r0
    const r1 = axis === 'r' ? slice : box.r1
    const g0 = axis === 'g' ? slice : box.g0
    const g1 = axis === 'g' ? slice : box.g1
    const b0 = axis === 'b' ? slice : box.b0
    const b1 = axis === 'b' ? slice : box.b1
    for (let r = r0; r <= r1; r++) {
      for (let g = g0; g <= g1; g++) {
        const base = (r << (BITS * 2)) | (g << BITS)
        for (let b = b0; b <= b1; b++) total += this.counts[base | b]
      }
    }
    return total
  }
}

/**
 * Turns RGBA pixels into palette indexes. Every colour it has already seen is
 * remembered, so the nearest colour search runs at most once per bucket
 * instead of once per pixel.
 */
export class PaletteMapper {
  private readonly cache = new Int16Array(BUCKETS).fill(-1)

  constructor(private readonly palette: Uint8Array) {}

  get colors(): number {
    return Math.floor(this.palette.length / 3)
  }

  /** Writes one index per pixel into `out`, which holds width times height. */
  map(rgba: Uint8Array | Uint8ClampedArray, out: Uint8Array): void {
    const cache = this.cache
    for (let pixel = 0, at = 0; at + 3 < rgba.length; pixel++, at += 4) {
      const bucket = bucketOf(rgba[at], rgba[at + 1], rgba[at + 2])
      let index = cache[bucket]
      if (index < 0) {
        index = this.nearest(rgba[at], rgba[at + 1], rgba[at + 2])
        cache[bucket] = index
      }
      out[pixel] = index
    }
  }

  /** The palette entry closest to one colour, by squared distance. */
  nearest(r: number, g: number, b: number): number {
    let best = 0
    let bestDistance = Infinity
    for (let index = 0, at = 0; at + 2 < this.palette.length; index++, at += 3) {
      const dr = r - this.palette[at]
      const dg = g - this.palette[at + 1]
      const db = b - this.palette[at + 2]
      const distance = dr * dr + dg * dg + db * db
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
        if (distance === 0) break
      }
    }
    return best
  }
}

/** A byte array that grows. */
class ByteWriter {
  private bytes = new Uint8Array(1 << 16)
  private length = 0

  byte(value: number): void {
    this.reserve(1)
    this.bytes[this.length++] = value & 0xff
  }

  short(value: number): void {
    this.byte(value)
    this.byte(value >> 8)
  }

  bytesOf(values: ArrayLike<number>): void {
    this.reserve(values.length)
    this.bytes.set(values as Uint8Array, this.length)
    this.length += values.length
  }

  text(value: string): void {
    for (let i = 0; i < value.length; i++) this.byte(value.charCodeAt(i))
  }

  /** Overwrites a two byte value written earlier. Used to extend a delay. */
  patchShort(offset: number, value: number): void {
    this.bytes[offset] = value & 0xff
    this.bytes[offset + 1] = (value >> 8) & 0xff
  }

  shortAt(offset: number): number {
    return this.bytes[offset] | (this.bytes[offset + 1] << 8)
  }

  get size(): number {
    return this.length
  }

  finish(): Uint8Array {
    return this.bytes.slice(0, this.length)
  }

  private reserve(extra: number): void {
    if (this.length + extra <= this.bytes.length) return
    let size = this.bytes.length * 2
    while (size < this.length + extra) size *= 2
    const grown = new Uint8Array(size)
    grown.set(this.bytes.subarray(0, this.length))
    this.bytes = grown
  }
}

/** LZW as GIF wants it, with a code size that grows from nine to twelve bits. */
export function lzwEncode(indexes: Uint8Array, minCodeSize: number): Uint8Array {
  const out: number[] = []
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  const maxCode = 1 << 12

  const HASH_SIZE = 1 << 13
  const HASH_MASK = HASH_SIZE - 1
  const keys = new Int32Array(HASH_SIZE).fill(-1)
  const codes = new Int32Array(HASH_SIZE)

  let bits = minCodeSize + 1
  let limit = (1 << bits) - 1
  let next = endCode + 1
  let bitBuffer = 0
  let bitCount = 0

  const emit = (code: number) => {
    bitBuffer |= code << bitCount
    bitCount += bits
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff)
      bitBuffer >>= 8
      bitCount -= 8
    }
    // The code size grows once the table has outgrown it. The decoder counts
    // its entries the same way, so both sides change size on the same code.
    if (next > limit && bits < 12) {
      bits++
      limit = bits === 12 ? maxCode : (1 << bits) - 1
    }
  }

  emit(clearCode)
  if (indexes.length === 0) {
    emit(endCode)
  } else {
    let prefix = indexes[0]
    for (let i = 1; i < indexes.length; i++) {
      const value = indexes[i]
      const key = (prefix << 8) | value
      let slot = ((key >> 12) ^ key) & HASH_MASK
      let found = -1
      while (keys[slot] !== -1) {
        if (keys[slot] === key) {
          found = codes[slot]
          break
        }
        slot = (slot + 1) & HASH_MASK
      }
      if (found >= 0) {
        prefix = found
        continue
      }
      emit(prefix)
      if (next < maxCode) {
        keys[slot] = key
        codes[slot] = next++
      } else {
        emit(clearCode)
        keys.fill(-1)
        next = endCode + 1
        bits = minCodeSize + 1
        limit = (1 << bits) - 1
      }
      prefix = value
    }
    emit(prefix)
    emit(endCode)
  }
  if (bitCount > 0) out.push(bitBuffer & 0xff)
  return Uint8Array.from(out)
}

export interface GifWriterOptions {
  /** RGB triplets. Up to 255 colours: one slot is kept for transparency. */
  palette: Uint8Array
  /** 0 means forever. */
  loopCount?: number
}

/**
 * Writes a GIF89a file frame by frame.
 *
 * Two things keep the file small, and both come free with the format:
 *
 * - Only the rectangle that changed is written.
 * - Pixels that did not change are written as transparent, so they show the
 *   frame below them. Long runs of one value are what LZW packs best.
 */
export class GifWriter {
  private readonly out = new ByteWriter()
  private readonly transparentIndex: number
  private readonly tableSize: number
  private previous: Uint8Array | null = null
  private lastDelayOffset = -1
  private started = false

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly options: GifWriterOptions,
  ) {
    const colors = Math.floor(options.palette.length / 3)
    this.transparentIndex = Math.min(255, colors)
    let size = 2
    while (size < colors + 1) size *= 2
    this.tableSize = Math.min(256, size)
  }

  private header(): void {
    const out = this.out
    out.text('GIF89a')
    out.short(this.width)
    out.short(this.height)
    // Global colour table, eight bits of colour resolution, table size.
    out.byte(0x80 | 0x70 | (Math.log2(this.tableSize) - 1))
    out.byte(0)
    out.byte(0)
    const table = new Uint8Array(this.tableSize * 3)
    table.set(this.options.palette.subarray(0, Math.min(this.options.palette.length, table.length)))
    out.bytesOf(table)

    // The Netscape block is how a GIF says it repeats.
    out.byte(0x21)
    out.byte(0xff)
    out.byte(11)
    out.text('NETSCAPE2.0')
    out.byte(3)
    out.byte(1)
    out.short(this.options.loopCount ?? 0)
    out.byte(0)
    this.started = true
  }

  /**
   * Adds one frame.
   *
   * @param indexes One palette index per pixel, width times height of them.
   * @param delayCs How long the frame stays on screen, in hundredths of a
   *   second. A frame the same as the one before it is not written: its time
   *   is added to the frame before instead.
   */
  addFrame(indexes: Uint8Array, delayCs: number): void {
    if (!this.started) this.header()
    const delay = Math.max(1, Math.round(delayCs))

    let left = 0
    let top = 0
    let width = this.width
    let height = this.height
    let frame = indexes

    if (this.previous) {
      const box = this.changedBox(indexes)
      if (!box) {
        // Nothing moved. Hold the frame before this one for longer.
        if (this.lastDelayOffset >= 0) {
          const held = Math.min(0xffff, this.out.shortAt(this.lastDelayOffset) + delay)
          this.out.patchShort(this.lastDelayOffset, held)
        }
        return
      }
      left = box.left
      top = box.top
      width = box.width
      height = box.height
      frame = this.crop(indexes, box)
    }

    this.out.byte(0x21)
    this.out.byte(0xf9)
    this.out.byte(4)
    // Disposal "leave in place", so transparent pixels keep what is under them.
    this.out.byte((1 << 2) | (this.previous ? 1 : 0))
    this.lastDelayOffset = this.out.size
    this.out.short(delay)
    this.out.byte(this.transparentIndex)
    this.out.byte(0)

    this.out.byte(0x2c)
    this.out.short(left)
    this.out.short(top)
    this.out.short(width)
    this.out.short(height)
    this.out.byte(0)

    const minCodeSize = Math.max(2, Math.log2(this.tableSize))
    const packed = lzwEncode(frame, minCodeSize)
    this.out.byte(minCodeSize)
    for (let at = 0; at < packed.length; at += 255) {
      const block = packed.subarray(at, Math.min(at + 255, packed.length))
      this.out.byte(block.length)
      this.out.bytesOf(block)
    }
    this.out.byte(0)

    this.previous = indexes.slice()
  }

  /** Closes the file. */
  finish(): Uint8Array {
    if (!this.started) this.header()
    this.out.byte(0x3b)
    return this.out.finish()
  }

  /** The smallest rectangle holding every pixel that changed. */
  private changedBox(indexes: Uint8Array): { left: number; top: number; width: number; height: number } | null {
    const previous = this.previous
    if (!previous) return { left: 0, top: 0, width: this.width, height: this.height }
    let minX = this.width
    let minY = this.height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < this.height; y++) {
      const row = y * this.width
      for (let x = 0; x < this.width; x++) {
        if (indexes[row + x] === previous[row + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    if (maxX < 0) return null
    return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  }

  /** The changed rectangle, with the pixels that stayed the same made clear. */
  private crop(indexes: Uint8Array, box: { left: number; top: number; width: number; height: number }): Uint8Array {
    const previous = this.previous
    const out = new Uint8Array(box.width * box.height)
    for (let y = 0; y < box.height; y++) {
      const from = (box.top + y) * this.width + box.left
      const to = y * box.width
      for (let x = 0; x < box.width; x++) {
        const value = indexes[from + x]
        out[to + x] = previous && previous[from + x] === value ? this.transparentIndex : value
      }
    }
    return out
  }
}
