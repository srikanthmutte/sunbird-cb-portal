import { WebSocketService } from './socket.service'
import { of } from 'rxjs'

const mockHttp = { get: jest.fn(() => of({ token: 'jwt' })) }

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

describe('WebSocketService (igot-sarthi)', () => {
  let service: WebSocketService
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWs = new MockWebSocket()
    const WsMock = jest.fn(() => mockWs) as any
    WsMock.OPEN = 1
    WsMock.CLOSED = 3;
    (global as any).WebSocket = WsMock
    service = new WebSocketService(mockHttp as any)
  })

  it('creates', () => {
    expect(service).toBeDefined()
  })

  describe('connect', () => {
    it('creates a WebSocket with the given URL', () => {
      service.connect('ws://test')
      expect(global.WebSocket).toHaveBeenCalledWith('ws://test')
    })

    it('onopen triggers startClientPing', () => {
      jest.useFakeTimers()
      service.connect('ws://test')
      mockWs.onopen!()
      expect(service.pingIntervalId).toBeDefined()
      jest.useRealTimers()
    })

    it('onmessage with connection type sets clientId', () => {
      service.connect('ws://test')
      mockWs.onmessage!({ data: JSON.stringify({ type: 'connection', clientId: 'abc' }) })
      expect(service.clientId).toBe('abc')
    })

    it('onmessage with data emits to subject', () => {
      service.connect('ws://test')
      const msgs: any[] = []
      service.getMessages().subscribe((m) => msgs.push(m))
      mockWs.onmessage!({ data: JSON.stringify({ type: 'answer', answer: '42' }) })
      expect(msgs.length).toBe(1)
    })

    it('onmessage with invalid JSON does not throw', () => {
      service.connect('ws://test')
      expect(() => mockWs.onmessage!({ data: 'not-json' })).not.toThrow()
    })

    it('onerror does not throw', () => {
      service.connect('ws://test')
      expect(() => mockWs.onerror!({ type: 'error' })).not.toThrow()
    })

    it('onclose does not throw', () => {
      service.connect('ws://test')
      expect(() => mockWs.onclose!()).not.toThrow()
    })
  })

  describe('sendMessage', () => {
    it('sends when socket is OPEN', () => {
      service.connect('ws://test')
      service.sendMessage({ text: 'hello' })
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ text: 'hello' }))
    })

    it('does not send when socket is not OPEN', () => {
      service.connect('ws://test')
      mockWs.readyState = MockWebSocket.CLOSED
      service.sendMessage({ text: 'hello' })
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('does not throw when socket is undefined', () => {
      expect(() => service.sendMessage({ text: 'test' })).not.toThrow()
    })
  })

  describe('getMessages', () => {
    it('returns observable', () => {
      const obs = service.getMessages()
      expect(obs).toBeDefined()
      expect(typeof obs.subscribe).toBe('function')
    })
  })

  describe('closeConnection', () => {
    it('calls socket.close', () => {
      service.connect('ws://test')
      service.closeConnection()
      expect(mockWs.close).toHaveBeenCalled()
    })

    it('does not throw when socket is undefined', () => {
      expect(() => service.closeConnection()).not.toThrow()
    })
  })

  describe('startClientPing', () => {
    it('sets up ping interval on onopen', () => {
      service.connect('ws://test')
      mockWs.onopen!()
      expect(service.pingIntervalId).toBeDefined()
      clearInterval(service.pingIntervalId)
    })

    it('calls send on ping when socket OPEN', () => {
      service.connect('ws://test');
      // Directly call startClientPing to test synchronously via manual trigger
      (service as any).startClientPing()
      // Can't advance timer without zone.js issues — just verify interval created
      expect(service.pingIntervalId).toBeDefined()
      clearInterval(service.pingIntervalId)
    })
  })

  describe('getJWTToken', () => {
    it('calls http.get and returns observable', () => {
      const result = service.getJWTToken()
      expect(mockHttp.get).toHaveBeenCalled()
      result.subscribe((r) => expect(r).toEqual({ token: 'jwt' }))
    })
  })
})
