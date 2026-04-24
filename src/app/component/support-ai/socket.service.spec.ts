import { WebSocketService } from './socket.service'

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

describe('WebSocketService (support-ai)', () => {
  let service: WebSocketService
  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWs = new MockWebSocket()
    const WsMock = jest.fn(() => mockWs) as any
    WsMock.OPEN = 1
    WsMock.CLOSED = 3;
    (global as any).WebSocket = WsMock
    service = new WebSocketService()
  })

  it('creates', () => {
    expect(service).toBeDefined()
  })

  describe('connect', () => {
    it('creates a WebSocket with the given URL', () => {
      service.connect('ws://test')
      expect(global.WebSocket).toHaveBeenCalledWith('ws://test')
    })

    it('onopen logs connection established', () => {
      service.connect('ws://test')
      expect(() => mockWs.onopen!()).not.toThrow()
    })

    it('onmessage emits data to subject', () => {
      service.connect('ws://test')
      const msgs: any[] = []
      service.getMessages().subscribe((m) => msgs.push(m))
      mockWs.onmessage!({ data: 'test-data' })
      expect(msgs).toHaveLength(1)
      expect(msgs[0]).toBe('test-data')
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
      service.sendMessage('hello')
      expect(mockWs.send).toHaveBeenCalledWith('hello')
    })

    it('does not send when socket readyState is not OPEN', () => {
      service.connect('ws://test')
      mockWs.readyState = MockWebSocket.CLOSED
      service.sendMessage('hello')
      expect(mockWs.send).not.toHaveBeenCalled()
    })

    it('does not throw when socket is undefined', () => {
      expect(() => service.sendMessage('test')).not.toThrow()
    })
  })

  describe('getMessages', () => {
    it('returns observable with share', () => {
      const obs = service.getMessages()
      expect(obs).toBeDefined()
      expect(typeof obs.subscribe).toBe('function')
    })

    it('shared observable receives messages', () => {
      service.connect('ws://test')
      const msgs1: any[] = []
      const msgs2: any[] = []
      service.getMessages().subscribe((m) => msgs1.push(m))
      service.getMessages().subscribe((m) => msgs2.push(m))
      mockWs.onmessage!({ data: 'msg' })
      expect(msgs1).toHaveLength(1)
      expect(msgs2).toHaveLength(1)
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
})
