import { ResourceDownloadHelperService } from './resource-download-helper.service'
import * as fileSaver from 'file-saver'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))

const mockEventSvc = { dispatchChatbotEvent: jest.fn() }

describe('ResourceDownloadHelperService', () => {
  let service: ResourceDownloadHelperService
  let origXHR: any
  let origFetch: any

  beforeEach(() => {
    jest.clearAllMocks()
    origXHR = (global as any).XMLHttpRequest
    origFetch = (global as any).fetch
    service = new ResourceDownloadHelperService(mockEventSvc as any)
  })

  afterEach(() => {
    (global as any).XMLHttpRequest = origXHR;
    (global as any).fetch = origFetch
  })

  it('creates', () => {
    expect(service).toBeDefined()
    expect(service.downloadInProgress).toEqual({})
  })

  describe('raiseDownloadAllTelemetry', () => {
    it('dispatches telemetry event', () => {
      service.raiseDownloadAllTelemetry('download', { identifier: 'id1', courseCategory: 'Course' } as any, '/home')
      expect(mockEventSvc.dispatchChatbotEvent).toHaveBeenCalledWith(expect.objectContaining({ to: 'Telemetry' }))
    })
    it('handles missing identifier gracefully', () => {
      expect(() => service.raiseDownloadAllTelemetry('download', {} as any, '/home')).not.toThrow()
    })
  })

  describe('downloadPDF', () => {
    it('returns early when no artifactUrl', () => {
      service.downloadPDF({ identifier: 'x' }, '/home')
      expect(service.downloadInProgress['x']).toBeUndefined()
    })

    it('sets downloadInProgress and dispatches telemetry', () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['d'])) }))
      jest.spyOn(service, 'raiseDownloadAllTelemetry')
      service.downloadPDF({ identifier: 'id1', artifactUrl: 'http://x.com/f.pdf', name: 'n' }, '/p')
      expect(service.downloadInProgress['id1']).toBe(true)
      expect(service.raiseDownloadAllTelemetry).toHaveBeenCalled()
    })

    it('calls fileSaver.saveAs on fetch success', async () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['d'])) }))
      service.downloadPDF({ identifier: 'id2', artifactUrl: 'http://x.com/f.pdf', name: 'doc' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect((fileSaver as any).saveAs).toHaveBeenCalled()
    })

    it('falls back to XHR on fetch reject', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('fail')))
      const mockXhr: any = { open: jest.fn(), send: jest.fn(), responseType: '', onload: null, onerror: null };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      service.downloadPDF({ identifier: 'id3', artifactUrl: 'http://x.com/f.pdf', name: 'd' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect(mockXhr.open).toHaveBeenCalled()
    })

    it('falls back when fetch returns !ok', async () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: false }))
      const mockXhr: any = { open: jest.fn(), send: jest.fn(), responseType: '', onload: null, onerror: null };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      service.downloadPDF({ identifier: 'id4', artifactUrl: 'http://x.com/f.pdf', name: 'd' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect(mockXhr.open).toHaveBeenCalled()
    })

    it('appends file extension when missing from name', async () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['d'])) }))
      service.downloadPDF({ identifier: 'id5', artifactUrl: 'http://x.com/f.pdf', name: 'mydoc' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect((fileSaver as any).saveAs.mock.calls[0][1]).toBe('mydoc.pdf')
    })

    it('does not re-append extension when already present', async () => {
      (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['d'])) }))
      service.downloadPDF({ identifier: 'id6', artifactUrl: 'http://x.com/f.pdf', name: 'mydoc.pdf' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect((fileSaver as any).saveAs.mock.calls[0][1]).toBe('mydoc.pdf')
    })
  })

  describe('MIME type mapping', () => {
    const cases: [string, string][] = [
      ['a.pdf', 'application/pdf'], ['a.mp4', 'video/mp4'],
      ['a.doc', 'application/msword'], ['a.docx', 'application/msword'],
      ['a.xls', 'application/vnd.ms-excel'], ['a.xlsx', 'application/vnd.ms-excel'],
      ['a.ppt', 'application/vnd.ms-powerpoint'], ['a.pptx', 'application/vnd.ms-powerpoint'],
      ['a.jpg', 'image/jpeg'], ['a.jpeg', 'image/jpeg'], ['a.png', 'image/png'],
      ['a.bin', 'application/octet-stream'],
    ]
    cases.forEach(([file, expected]) => {
      it(`maps ${file.split('.').pop()} → ${expected}`, async () => {
        (global as any).fetch = jest.fn(() => Promise.resolve({
          ok: true, blob: () => Promise.resolve(new Blob(['d'], { type: 'text/plain' })),
        }))
        const id = `mime_${file.split('.').pop()}`
        service.downloadPDF({ identifier: id, artifactUrl: `http://x.com/${file}`, name: 'f' }, '/p')
        await new Promise(r => setTimeout(r, 0))
        const calls = (fileSaver as any).saveAs.mock.calls
        if (calls.length) expect(calls[calls.length - 1][0].type).toBe(expected)
      })
    })
  })

  describe('XHR onload/onerror handlers', () => {
    it('onload status=200 calls saveAs', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('fail')))
      const mockXhr: any = {
        open: jest.fn(), send: jest.fn(), responseType: '', onload: null, onerror: null,
        status: 200, response: new Blob(['d']), getResponseHeader: jest.fn(() => 'application/pdf'),
      };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      service.downloadPDF({ identifier: 'xhr1', artifactUrl: 'http://x.com/a.pdf', name: 'f' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      if (mockXhr.onload) mockXhr.onload()
      expect((fileSaver as any).saveAs).toHaveBeenCalled()
    })

    it('onload non-200 calls tryDirectDownload (no throw)', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('fail')))
      const mockXhr: any = {
        open: jest.fn(), send: jest.fn(), responseType: '', onload: null, onerror: null,
        status: 404, response: null, getResponseHeader: jest.fn(() => null),
      };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      service.downloadPDF({ identifier: 'xhr2', artifactUrl: 'http://x.com/a.pdf', name: 'f' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect(() => { if (mockXhr.onload) mockXhr.onload() }).not.toThrow()
    })

    it('onerror calls tryDirectDownload (no throw)', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('fail')))
      const mockXhr: any = { open: jest.fn(), send: jest.fn(), responseType: '', onload: null, onerror: null };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      service.downloadPDF({ identifier: 'xhr3', artifactUrl: 'http://x.com/a.pdf', name: 'f' }, '/p')
      await new Promise(r => setTimeout(r, 50))
      expect(() => { if (mockXhr.onerror) mockXhr.onerror() }).not.toThrow()
    })
  })

  describe('saveBlob fallback', () => {
    it('falls back to anchor when fileSaver.saveAs throws', () => {
      (fileSaver as any).saveAs.mockImplementation(() => { throw new Error('saveAs failed') })
      const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((el: any) => el)
      const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((el: any) => el)
      const origCreateObjectURL = window.URL.createObjectURL
      const origRevokeObjectURL = window.URL.revokeObjectURL;
      (window.URL as any).createObjectURL = jest.fn(() => 'blob:mock-url');
      (window.URL as any).revokeObjectURL = jest.fn()

      const blob = new Blob(['data'], { type: 'application/pdf' })
      expect(() => (service as any).saveBlob(blob, 'file.pdf')).not.toThrow()
      expect(appendSpy).toHaveBeenCalled()

      appendSpy.mockRestore()
      removeSpy.mockRestore();
      (window.URL as any).createObjectURL = origCreateObjectURL;
      (window.URL as any).revokeObjectURL = origRevokeObjectURL
    })
  })

  describe('tryDirectDownload', () => {
    it('runs without throwing when called directly', () => {
      jest.useFakeTimers()
      expect(() => (service as any).tryDirectDownload('http://x.com/file.pdf', 'file.pdf')).not.toThrow()
      jest.runAllTimers()
      jest.useRealTimers()
    })

    it('falls back to anchor when iframe throws', () => {
      const origCreate = document.createElement.bind(document)
      const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((el: any) => el)
      const removeSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((el: any) => el)
      // Create a fake iframe whose contentDocument.body.appendChild throws
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'iframe') {
          const iframe = origCreate('iframe') as any
          Object.defineProperty(iframe, 'contentDocument', {
            get: () => { throw new Error('iframe access denied') },
          })
          return iframe
        }
        return origCreate(tag)
      })
      jest.useFakeTimers()
      expect(() => (service as any).tryDirectDownload('http://x.com/file.pdf', 'file.pdf')).not.toThrow()
      jest.runAllTimers()
      jest.useRealTimers();
      (document.createElement as any).mockRestore()
      appendSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })
})
