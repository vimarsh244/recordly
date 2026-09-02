import { describe, expect, it } from 'vitest'
import { ColorHistogram, GifWriter, PaletteMapper, lzwEncode } from '../encoder'

/**
 * A small GIF reader. The writer has no other way to prove that what it made
 * is a real file, so the tests read the bytes back and compare the pixels.
 */
interface DecodedFrame {
  delayCs: number
  /** One RGB triplet per pixel of the whole canvas, after disposal. */
  pixels: Uint8Array
}

function decodeGif(bytes: Uint8Array): { width: number; height: number; frames: DecodedFrame[] } {
  let at = 0
  const byte = () => bytes[at++]
  const short = () => {
    const value = bytes[at] | (bytes[at + 1] << 8)
    at += 2
    return value
  }
  const signature = String.fromCharCode(...bytes.subarray(0, 6))
  expect(signature).toBe('GIF89a')
  at = 6
  const width = short()
  const height = short()
  const packed = byte()
  byte()
  byte()
  const tableSize = 1 << ((packed & 0x07) + 1)
  const table = bytes.subarray(at, at + tableSize * 3)
  at += tableSize * 3

  const canvas = new Uint8Array(width * height * 3)
  const frames: DecodedFrame[] = []
  let delayCs = 0
  let transparent = -1

  for (;;) {
    const block = byte()
    if (block === 0x3b) break
    if (block === 0x21) {
      const label = byte()
      if (label === 0xf9) {
        byte()
        const flags = byte()
        delayCs = short()
        const index = byte()
        transparent = flags & 1 ? index : -1
        byte()
      } else {
        // Every other extension is a run of sized blocks ending in a zero.
        for (;;) {
          const size = byte()
          if (size === 0) break
          at += size
        }
      }
      continue
    }
    expect(block).toBe(0x2c)
    const left = short()
    const top = short()
    const frameWidth = short()
    const frameHeight = short()
    expect(byte() & 0x80).toBe(0) // No local colour table.
    const minCodeSize = byte()
    const data: number[] = []
    for (;;) {
      const size = byte()
      if (size === 0) break
      for (let i = 0; i < size; i++) data.push(bytes[at + i])
      at += size
    }
    const indexes = lzwDecode(Uint8Array.from(data), minCodeSize, frameWidth * frameHeight)
    for (let y = 0; y < frameHeight; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const index = indexes[y * frameWidth + x]
        if (index === transparent) continue
        const to = ((top + y) * width + left + x) * 3
        canvas[to] = table[index * 3]
        canvas[to + 1] = table[index * 3 + 1]
        canvas[to + 2] = table[index * 3 + 2]
      }
    }
    frames.push({ delayCs, pixels: canvas.slice() })
  }
  return { width, height, frames }
}

function lzwDecode(data: Uint8Array, minCodeSize: number, pixels: number): Uint8Array {
  const clearCode = 1 << minCodeSize
  const endCode = clearCode + 1
  let bits = minCodeSize + 1
  let dictionary: number[][] = []
  const reset = () => {
    dictionary = []
    for (let i = 0; i < clearCode; i++) dictionary.push([i])
    dictionary.push([], [])
    bits = minCodeSize + 1
  }
  reset()

  const out: number[] = []
  let buffer = 0
  let bufferBits = 0
  let at = 0
  let previous: number[] | null = null

  while (out.length < pixels) {
    while (bufferBits < bits) {
      if (at >= data.length) return Uint8Array.from(out)
      buffer |= data[at++] << bufferBits
      bufferBits += 8
    }
    const code = buffer & ((1 << bits) - 1)
    buffer >>= bits
    bufferBits -= bits

    if (code === clearCode) {
      reset()
      previous = null
      continue
    }
    if (code === endCode) break

    let entry: number[]
    if (code < dictionary.length && dictionary[code].length > 0) entry = dictionary[code]
    else if (previous) entry = [...previous, previous[0]]
    else throw new Error('Bad code in the stream.')

    out.push(...entry)
    if (previous) {
      dictionary.push([...previous, entry[0]])
      if (dictionary.length === 1 << bits && bits < 12) bits++
    }
    previous = entry
  }
  return Uint8Array.from(out)
}

/** A frame of flat colour blocks, as RGBA. */
function frameOf(width: number, height: number, colorAt: (x: number, y: number) => [number, number, number]): Uint8Array {
  const rgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colorAt(x, y)
      const at = (y * width + x) * 4
      rgba[at] = r
      rgba[at + 1] = g
      rgba[at + 2] = b
      rgba[at + 3] = 255
    }
  }
  return rgba
}

describe('lzwEncode', () => {
  it('round trips bytes of every value', () => {
    const source = new Uint8Array(5000)
    let seed = 7
    for (let i = 0; i < source.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      source[i] = seed & 0xff
    }
    const decoded = lzwDecode(lzwEncode(source, 8), 8, source.length)
    expect(Array.from(decoded)).toEqual(Array.from(source))
  })

  it('round trips a long run, which is what fills the table', () => {
    const source = new Uint8Array(70_000)
    for (let i = 0; i < source.length; i++) source[i] = (i % 97) & 0xff
    const decoded = lzwDecode(lzwEncode(source, 8), 8, source.length)
    expect(Array.from(decoded)).toEqual(Array.from(source))
  })
})

describe('ColorHistogram', () => {
  it('gives back the colours it was shown', () => {
    const histogram = new ColorHistogram()
    histogram.add(frameOf(4, 1, (x) => [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]][x] as [number, number, number]))
    const palette = histogram.palette(8)
    const mapper = new PaletteMapper(palette)
    for (const color of [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
    ]) {
      const index = mapper.nearest(color[0], color[1], color[2])
      expect(palette[index * 3]).toBeCloseTo(color[0], -1)
      expect(palette[index * 3 + 1]).toBeCloseTo(color[1], -1)
      expect(palette[index * 3 + 2]).toBeCloseTo(color[2], -1)
    }
  })

  it('never asks for more colours than the caller allows', () => {
    const histogram = new ColorHistogram()
    histogram.add(frameOf(64, 64, (x, y) => [x * 4, y * 4, (x + y) * 2]))
    expect(histogram.palette(16).length / 3).toBeLessThanOrEqual(16)
    expect(histogram.palette(255).length / 3).toBeLessThanOrEqual(255)
  })
})

describe('GifWriter', () => {
  const width = 16
  const height = 8
  const red: [number, number, number] = [220, 30, 30]
  const blue: [number, number, number] = [30, 30, 220]
  const green: [number, number, number] = [30, 200, 30]

  function write(frames: Uint8Array[]): Uint8Array {
    const histogram = new ColorHistogram()
    for (const frame of frames) histogram.add(frame)
    const palette = histogram.palette(255)
    const mapper = new PaletteMapper(palette)
    const writer = new GifWriter(width, height, { palette })
    const indexes = new Uint8Array(width * height)
    for (const frame of frames) {
      mapper.map(frame, indexes)
      writer.addFrame(indexes, 8)
    }
    return writer.finish()
  }

  function colorAt(decoded: DecodedFrame, x: number, y: number): [number, number, number] {
    const at = (y * width + x) * 3
    return [decoded.pixels[at], decoded.pixels[at + 1], decoded.pixels[at + 2]]
  }

  it('writes a file that reads back with the right pixels', () => {
    const first = frameOf(width, height, (x) => (x < 8 ? red : blue))
    const second = frameOf(width, height, (x) => (x < 8 ? red : green))
    const gif = decodeGif(write([first, second]))

    expect(gif.width).toBe(width)
    expect(gif.height).toBe(height)
    expect(gif.frames).toHaveLength(2)
    expect(colorAt(gif.frames[0], 2, 2)).toEqual(red)
    expect(colorAt(gif.frames[0], 12, 2)).toEqual(blue)
    expect(colorAt(gif.frames[1], 2, 2)).toEqual(red)
    expect(colorAt(gif.frames[1], 12, 2)).toEqual(green)
  })

  it('holds a frame instead of writing it again when nothing moved', () => {
    const still = frameOf(width, height, () => red)
    const gif = decodeGif(write([still, still, still]))
    expect(gif.frames).toHaveLength(1)
    expect(gif.frames[0].delayCs).toBe(24)
  })

  it('keeps the part of a frame that did not change', () => {
    // A three pixel wide square that moves. Everything around it must stay.
    const square = (offset: number) =>
      frameOf(width, height, (x, y) => (x >= offset && x < offset + 3 && y >= 2 && y < 5 ? green : blue))
    const gif = decodeGif(write([square(1), square(6), square(11)]))
    expect(gif.frames).toHaveLength(3)
    for (const [frame, offset] of [
      [gif.frames[0], 1],
      [gif.frames[1], 6],
      [gif.frames[2], 11],
    ] as const) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const inside = x >= offset && x < offset + 3 && y >= 2 && y < 5
          expect(colorAt(frame, x, y)).toEqual(inside ? green : blue)
        }
      }
    }
  })

  it('writes a full palette of colours back correctly', () => {
    // Enough colours to need the whole 256 entry table and eight bit codes.
    const shade = (x: number, y: number): [number, number, number] => [x * 16, y * 32, 128]
    const first = frameOf(width, height, shade)
    const second = frameOf(width, height, (x, y) => shade(width - 1 - x, y))
    const gif = decodeGif(write([first, second]))
    expect(gif.frames).toHaveLength(2)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b] = colorAt(gif.frames[1], x, y)
        const [wantR, wantG, wantB] = shade(width - 1 - x, y)
        expect(Math.abs(r - wantR)).toBeLessThanOrEqual(8)
        expect(Math.abs(g - wantG)).toBeLessThanOrEqual(8)
        expect(Math.abs(b - wantB)).toBeLessThanOrEqual(8)
      }
    }
  })

  it('ends with the trailer byte', () => {
    const bytes = write([frameOf(width, height, () => red)])
    expect(bytes[bytes.length - 1]).toBe(0x3b)
  })

  it('says the file loops forever', () => {
    const bytes = write([frameOf(width, height, () => red)])
    const text = String.fromCharCode(...bytes.subarray(0, 64))
    expect(text).toContain('NETSCAPE2.0')
  })
})
