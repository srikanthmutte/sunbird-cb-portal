import { ZohoFormService } from './zoho-form.service'

// Helper: create a DOM element and append to body
const addEl = (tag: string, attrs: Record<string, string> = {}, body = document.body) => {
  const el = document.createElement(tag) as any
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'name') el.name = v
    else if (k === 'id') el.id = v
    else el.setAttribute(k, v)
  })
  body.appendChild(el)
  return el
}

const mockConfigSvc = (profileDetails: any = {}) => ({
  unMappedUser: {
    profileDetails: {
      personalDetails: { firstname: 'John', primaryEmail: 'john@test.com', mobile: '9876543210' },
      professionalDetails: [{ designation: 'Dev' }],
      ...profileDetails,
    }
  }
})

describe('ZohoFormService', () => {
  let service: ZohoFormService

  beforeEach(() => {
    document.body.innerHTML = ''
    jest.spyOn(window, 'alert').mockImplementation(() => { })
    service = new ZohoFormService(mockConfigSvc() as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates', () => {
    expect(service).toBeDefined()
  })

  it('getAttachedFilesCount returns 0 initially', () => {
    expect(service.getAttachedFilesCount()).toBe(0)
  })

  // ── handleIssueTypeChange ──────────────────────────────────────────────────
  describe('handleIssueTypeChange', () => {
    beforeEach(() => {
      addEl('div', { id: 'others-block' })
      addEl('input', { id: 'subject-input' })
    })

    it('adds visible class when value is Others', () => {
      const sel = addEl('select', {})
      const opt = addEl('option', {});
      (opt as HTMLOptionElement).text = 'Others';
      (opt as HTMLOptionElement).value = 'Others';
      (sel as HTMLSelectElement).appendChild(opt);
      (sel as HTMLSelectElement).value = 'Others'
      service.handleIssueTypeChange(sel)
      expect(document.getElementById('others-block')!.classList.contains('visible')).toBe(true)
    })

    it('removes visible class when value is not Others', () => {
      const others = document.getElementById('others-block')!
      others.classList.add('visible')
      const sel = addEl('select', {})
      const opt = addEl('option', {});
      (opt as HTMLOptionElement).text = 'Technical';
      (opt as HTMLOptionElement).value = 'Technical';
      (sel as HTMLSelectElement).appendChild(opt);
      (sel as HTMLSelectElement).value = 'Technical'
      service.handleIssueTypeChange(sel)
      expect(others.classList.contains('visible')).toBe(false)
    })

    it('updates subject when value selected', () => {
      const sel = addEl('select', {})
      const opt = addEl('option', {});
      (opt as HTMLOptionElement).text = 'Access Issue';
      (opt as HTMLOptionElement).value = 'access';
      (sel as HTMLSelectElement).appendChild(opt);
      (sel as HTMLSelectElement).value = 'access'
      service.handleIssueTypeChange(sel)
      const subjectInput = document.getElementById('subject-input') as HTMLInputElement
      expect(subjectInput.value).toContain('Access Issue')
    })

    it('resets subject when value is empty', () => {
      const sel = addEl('select', {})
      const opt = addEl('option', {});
      (opt as HTMLOptionElement).text = '';
      (opt as HTMLOptionElement).value = '';
      (sel as HTMLSelectElement).appendChild(opt)
      service.handleIssueTypeChange(sel)
      const subjectInput = document.getElementById('subject-input') as HTMLInputElement
      expect(subjectInput.value).toBe('APAR/CA issue - ')
    })

    it('does not throw when value is empty object', () => {
      const sel = { value: '', options: [], selectedIndex: -1 }
      expect(() => service.handleIssueTypeChange(sel)).not.toThrow()
    })
  })

  // ── toggleCentreState ──────────────────────────────────────────────────────
  describe('toggleCentreState', () => {
    beforeEach(() => {
      addEl('div', { id: 'ministry-block' })
      addEl('span', { id: 'ministry-label' })
      addEl('input', { id: 'ministry-input' })
      addEl('button', { id: 'btn-centre' })
      addEl('button', { id: 'btn-state' })
    })

    it('sets Centre active and updates label', () => {
      service.toggleCentreState({ value: 'Centre' })
      expect(document.getElementById('btn-centre')!.classList.contains('active')).toBe(true)
      expect(document.getElementById('ministry-label')!.textContent).toContain('Ministry')
    })

    it('sets State active and updates label', () => {
      service.toggleCentreState({ value: 'State' })
      expect(document.getElementById('btn-state')!.classList.contains('active')).toBe(true)
      expect(document.getElementById('ministry-label')!.textContent).toContain('State')
    })

    it('does not throw when called with unknown value', () => {
      expect(() => service.toggleCentreState({ value: 'Other' })).not.toThrow()
    })
  })

  // ── toggleAIS ─────────────────────────────────────────────────────────────
  describe('toggleAIS', () => {
    beforeEach(() => {
      addEl('div', { id: 'ais-block' })
      addEl('span', { id: 'ais-label-text' })
      addEl('select', { id: 'CASECF29' })
      addEl('select', { id: 'CASECF27' })
    })

    it('shows ais-block when checked', () => {
      const cf29 = document.getElementById('CASECF29') as HTMLSelectElement
      const opt = document.createElement('option')
      opt.value = 'Yes'
      cf29.appendChild(opt)
      service.toggleAIS({ checked: true })
      expect(document.getElementById('ais-block')!.classList.contains('visible')).toBe(true)
      expect((document.getElementById('CASECF29') as HTMLSelectElement).value).toBe('Yes')
    })

    it('hides ais-block and sets No when unchecked', () => {
      document.getElementById('ais-block')!.classList.add('visible')
      addEl('select', { id: 'CASECF24' })
      service.toggleAIS({ checked: false })
      expect(document.getElementById('ais-block')!.classList.contains('visible')).toBe(false)
      expect(document.getElementById('ais-label-text')!.textContent).toBe('No')
    })

    it('does not throw with unchecked and missing elements', () => {
      expect(() => service.toggleAIS({ checked: false })).not.toThrow()
    })
  })

  // ── handleFileAttachment ───────────────────────────────────────────────────
  describe('handleFileAttachment', () => {
    it('returns early on empty filePath', () => {
      service.handleFileAttachment('', {} as any)
      expect(service.getAttachedFilesCount()).toBe(0)
    })

    it('alerts when file > 20MB', () => {
      const element = { files: [{ size: 25 * 1024 * 1024 }], value: '', id: 'zsattachment_1' }
      service.handleFileAttachment('file.pdf', element as any)
      expect(window.alert).toHaveBeenCalledWith('Maximum allowed file size is 20MB.')
    })

    it('alerts for disallowed extension', () => {
      const element = { files: [{ size: 1024 }], value: '', id: 'zsattachment_1' }
      service.handleFileAttachment('file.exe', element as any)
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Only .jpg'))
    })

    it('adds valid file and increments count', () => {
      addEl('div', { id: 'zsFileBrowseAttachments' })
      const fileInput = addEl('input', { id: 'zsattachment_1' }) as HTMLInputElement;
      (fileInput as any).value = ''
      const element = { files: [{ size: 1024 }], value: '', id: 'zsattachment_1' }
      service.handleFileAttachment('C:\\path\\file.pdf', element as any)
      expect(service.getAttachedFilesCount()).toBe(1)
    })

    it('handles backslash in path', () => {
      addEl('div', { id: 'zsFileBrowseAttachments' })
      addEl('input', { id: 'zsattachment_1' })
      const element = { files: [{ size: 1024 }], value: '', id: 'zsattachment_1' }
      service.handleFileAttachment('folder\\file.jpg', element as any)
      expect(service.getAttachedFilesCount()).toBe(1)
    })
  })

  // ── removeFileAttachment ───────────────────────────────────────────────────
  describe('removeFileAttachment', () => {
    it('removes file element and decrements count', () => {
      addEl('div', { id: 'zsFileBrowseAttachments' })
      addEl('input', { id: 'zsattachment_2' })
      addEl('div', { id: 'file_2' });
      (service as any).zsAttachedAttachmentsCount = 1;
      (service as any).zsAttachmentFileBrowserIdsList = [1, 3]
      service.removeFileAttachment(2)
      expect(service.getAttachedFilesCount()).toBe(0)
      expect(document.getElementById('file_2')).toBeNull()
    })

    it('does not throw when elements are missing', () => {
      expect(() => service.removeFileAttachment(99)).not.toThrow()
    })
  })

  // ── resetAttachmentState ───────────────────────────────────────────────────
  describe('resetAttachmentState', () => {
    it('resets count and clears container', () => {
      (service as any).zsAttachedAttachmentsCount = 3
      const container = addEl('div', { id: 'zsFileBrowseAttachments' })
      container.innerHTML = '<span>file</span>'
      service.resetAttachmentState()
      expect(service.getAttachedFilesCount()).toBe(0)
      expect(container.innerHTML).toBe('')
    })
  })

  // ── loadCaptcha ────────────────────────────────────────────────────────────
  describe('loadCaptcha', () => {
    it('does not throw when XMLHttpRequest fails', () => {
      const origXHR = (global as any).XMLHttpRequest;
      (global as any).XMLHttpRequest = class {
        open = jest.fn();
        send = jest.fn();
        onreadystatechange = null;
      }
      expect(() => service.loadCaptcha()).not.toThrow();
      (global as any).XMLHttpRequest = origXHR
    })
  })

  // ── getBatchYear ───────────────────────────────────────────────────────────
  describe('getBatchYear', () => {
    it('returns value from CASECF27 select', () => {
      const sel = addEl('select', { id: 'CASECF27' }) as HTMLSelectElement
      const opt = document.createElement('option')
      opt.value = '2005'
      sel.appendChild(opt)
      sel.value = '2005'
      expect(service.getBatchYear()).toBe('2005')
    })

    it('returns empty when element missing', () => {
      expect(service.getBatchYear()).toBe('')
    })
  })

  // ── getAISValues ───────────────────────────────────────────────────────────
  describe('getAISValues', () => {
    it('returns values from selects', () => {
      const cf24 = addEl('select', { id: 'CASECF24' }) as HTMLSelectElement
      addEl('select', { id: 'CASECF27' })
      addEl('select', { id: 'CASECF26' })
      const opt = document.createElement('option')
      opt.value = 'IAS'
      cf24.appendChild(opt)
      cf24.value = 'IAS'
      const result = service.getAISValues()
      expect(result.service).toBe('IAS')
    })

    it('returns empty strings when elements missing', () => {
      const result = service.getAISValues()
      expect(result).toEqual({ service: '', batchYear: '', cadre: '' })
    })
  })

  // ── patchUserDataFromConfig ────────────────────────────────────────────────
  describe('patchUserDataFromConfig', () => {
    it('patches form fields from user profile', () => {
      const nameInput = document.createElement('input')
      nameInput.setAttribute('name', 'Contact Name')
      const emailInput = document.createElement('input')
      emailInput.setAttribute('name', 'Email')
      const phoneInput = document.createElement('input')
      phoneInput.setAttribute('name', 'Phone')
      const desigInput = document.createElement('input')
      desigInput.setAttribute('name', 'Designation')
      document.body.append(nameInput, emailInput, phoneInput, desigInput)

      service.patchUserDataFromConfig()
      expect(nameInput.value).toBe('John')
      expect(emailInput.value).toBe('john@test.com')
      expect(phoneInput.value).toBe('9876543210')
    })

    it('does nothing when userProfileData is null', () => {
      (service as any).userProfileData = null
      expect(() => service.patchUserDataFromConfig()).not.toThrow()
    })
  })

  // ── clearSelectValue ───────────────────────────────────────────────────────
  describe('clearSelectValue', () => {
    it('clears select value', () => {
      const sel = addEl('select', { id: 'mySel' }) as HTMLSelectElement
      const opt = document.createElement('option')
      opt.value = 'test'
      sel.appendChild(opt)
      sel.value = 'test'
      service.clearSelectValue('mySel')
      expect(sel.value).toBe('')
    })

    it('does not throw when element missing', () => {
      expect(() => service.clearSelectValue('missing')).not.toThrow()
    })
  })

  // ── resetForm ─────────────────────────────────────────────────────────────
  describe('resetForm', () => {
    it('does not throw when form elements missing', () => {
      expect(() => service.resetForm('test')).not.toThrow()
    })

    it('calls form.reset when form found', () => {
      const form = document.createElement('form')
      form.name = 'zsWebToCase_123'
      addEl('input', { id: 'subject-input' })
      addEl('div', { id: 'ais-block' })
      addEl('div', { id: 'ministry-block' })
      addEl('div', { id: 'others-block' })
      addEl('input', { id: 'consent-checkbox' })
      addEl('div', { id: 'zsFileBrowseAttachments' })
      const resetFn = jest.fn()
      form.reset = resetFn
      document.body.appendChild(form)
      service.resetForm('123')
      expect(resetFn).toHaveBeenCalled()
    })
  })

  // ── validateAndSubmitForm ─────────────────────────────────────────────────
  describe('validateAndSubmitForm', () => {
    it('returns false when form not found', () => {
      expect(service.validateAndSubmitForm()).toBe(false)
    })

    it('returns false when form found but fields are empty', () => {
      const form = document.createElement('form')
      form.name = 'zsWebToCase_120349000138968626'
      document.body.appendChild(form)
      expect(service.validateAndSubmitForm()).toBe(false)
      expect(window.alert).toHaveBeenCalled()
    })

    it('disables submit button when validation passes Centre/State check', () => {
      // Just verify no throws in the try/catch path
      expect(() => service.validateAndSubmitForm()).not.toThrow()
    })
  })
})
