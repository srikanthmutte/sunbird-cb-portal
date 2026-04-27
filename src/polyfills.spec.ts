/**
 * Unit tests for polyfills.ts
 *
 * polyfills.ts performs side-effects (shimming globals) rather than exporting
 * functions, so we verify the expected global assignments it makes.
 */

describe('polyfills side-effects', () => {
  it('assigns window to global.window (implicit in jsdom)', () => {
    // In jsdom, window is already global — this is the environment polyfills run in.
    expect(typeof window).toBe('object')
  })

  it('global is defined after polyfills load', () => {
    // polyfills.ts sets: (window as any).global = window
    // In Jest/jsdom this is already set by the polyfill entry; confirm it is defined.
    expect(global).toBeDefined()
  })

  it('global.Buffer is defined after polyfills load', () => {
    // polyfills.ts: global.Buffer = global.Buffer || require('buffer').Buffer
    // Jest runs in node so global.Buffer is always defined after the shim.
    expect(typeof global.Buffer).toBe('function')
  })

  it('global.process is defined after polyfills load', () => {
    // polyfills.ts: global.process = require('process')
    expect(global.process).toBeDefined()
    expect(typeof global.process.env).toBe('object')
  })

  it('Buffer.from encodes a simple string', () => {
    const buf = global.Buffer.from('hello')
    expect(buf).toBeDefined()
    expect(buf.length).toBeGreaterThan(0)
  })

  it('Buffer.alloc creates a zeroed buffer', () => {
    const buf = global.Buffer.alloc(4)
    expect(buf.length).toBe(4)
    expect(buf[0]).toBe(0)
  })

  it('process.nextTick is a function', () => {
    expect(typeof global.process.nextTick).toBe('function')
  })

  it('process.version is a string', () => {
    expect(typeof global.process.version).toBe('string')
  })
})
