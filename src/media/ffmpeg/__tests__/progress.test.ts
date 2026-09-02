import { describe, expect, it } from 'vitest'
import { parseLogTime } from '../client'

describe('parseLogTime', () => {
  it('reads the clock out of an encoder line', () => {
    const line = 'frame=  120 fps= 30 q=28.0 size=    512kB time=00:00:04.00 bitrate=1048.6kbits/s speed=1.0x'
    expect(parseLogTime(line)).toBeCloseTo(4)
  })

  it('handles hours and a padded value', () => {
    expect(parseLogTime('time=01:02:03.50')).toBeCloseTo(3723.5)
    expect(parseLogTime('time= 00:00:00.00')).toBe(0)
  })

  it('returns null for a line with no clock', () => {
    expect(parseLogTime('Stream mapping: #0:0 -> #0:0')).toBeNull()
  })
})
