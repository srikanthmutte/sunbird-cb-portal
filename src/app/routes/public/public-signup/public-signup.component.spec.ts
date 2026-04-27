import { forbiddenNamesValidator, forbiddenNamesValidatorNonEmpty, PublicSignupComponent } from './public-signup.component'
import { UntypedFormControl } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'

jest.mock('ng-recaptcha', () => ({ ReCaptchaV3Service: class { } }), { virtual: true })
jest.mock('./signup.service', () => ({ SignupService: class { } }), { virtual: true })
jest.mock('./signup-success-dialogue/signup-success-dialogue/signup-success-dialogue.component', () => ({ SignupSuccessDialogueComponent: class { } }), { virtual: true })
jest.mock('./terms-and-condition/terms-and-condition.component', () => ({ TermsAndConditionComponent: class { } }), { virtual: true })
jest.mock('@ws/app/src/lib/routes/user-profile/services/user-profile.service', () => ({ UserProfileService: class { } }), { virtual: true })
jest.mock('@ws/app/src/lib/routes/profile-v3/components/dialog-box/dialog-box.component', () => ({ DialogBoxComponent: class { } }), { virtual: true })
jest.mock('src/environments/environment', () => ({ environment: { zohoUrl: '', resendOTPTIme: 3000, sitePath: 'test.igot.gov.in' } }), { virtual: true })

jest.mock('lodash', () => {
  const get = (obj: any, path: string, def?: any) => {
    if (!obj) return def
    const r = path.split('.').reduce((o: any, k: string) => (o != null ? o[k] : undefined), obj)
    return r !== undefined ? r : def
  }
  return {
    __esModule: true,
    default: {
      get,
      uniqBy: (arr: any[], fn: any) => {
        const seen = new Set()
        return arr.filter(item => { const k = fn(item); if (seen.has(k)) return false; seen.add(k); return true })
      },
      startCase: (s: string) => s ? s.replace(/(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase()) : '',
    },
    get,
    startCase: (s: string) => s ? s.replace(/(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase()) : '',
  }
})

// ─── Validator tests ───────────────────────────────────────────────────────────

describe('forbiddenNamesValidator', () => {
  it('returns null when optionsArray is null', () => {
    const validator = forbiddenNamesValidator(null)
    const ctrl = new UntypedFormControl({ orgname: 'Test' })
    expect(validator(ctrl)).toBeNull()
  })

  it('returns null when control value is null', () => {
    const validator = forbiddenNamesValidator([{ orgname: 'Test Org' }])
    const ctrl = new UntypedFormControl(null)
    expect(validator(ctrl)).toBeNull()
  })

  it('returns null when orgname is found in array', () => {
    const validator = forbiddenNamesValidator([{ orgname: 'Test Org' }])
    const ctrl = new UntypedFormControl({ orgname: 'Test Org' })
    expect(validator(ctrl)).toBeNull()
  })

  it('returns forbiddenNames error when orgname not in array', () => {
    const validator = forbiddenNamesValidator([{ orgname: 'Test Org' }])
    const ctrl = new UntypedFormControl({ orgname: 'Unknown Org' })
    const result = validator(ctrl)
    expect(result).not.toBeNull()
    expect(result!['forbiddenNames']).toBeDefined()
  })

  it('returns forbiddenNames error when optionsArray is empty', () => {
    const validator = forbiddenNamesValidator([])
    const ctrl = new UntypedFormControl({ orgname: 'Some Org' })
    const result = validator(ctrl)
    expect(result).not.toBeNull()
  })

  it('handles undefined optionsArray', () => {
    const validator = forbiddenNamesValidator(undefined)
    const ctrl = new UntypedFormControl({ orgname: 'Test' })
    expect(validator(ctrl)).toBeNull()
  })

  it('handles control with empty string value', () => {
    const validator = forbiddenNamesValidator([{ orgname: 'Test' }])
    const ctrl = new UntypedFormControl('')
    expect(validator(ctrl)).toBeNull()
  })
})

describe('forbiddenNamesValidatorNonEmpty', () => {
  it('returns null when optionsArray is null', () => {
    const validator = forbiddenNamesValidatorNonEmpty(null)
    const ctrl = new UntypedFormControl({ orgname: 'Test' })
    expect(validator(ctrl)).toBeNull()
  })

  it('returns null when orgname is found in array', () => {
    const validator = forbiddenNamesValidatorNonEmpty([{ orgname: 'Test Org' }])
    const ctrl = new UntypedFormControl({ orgname: 'Test Org' })
    expect(validator(ctrl)).toBeNull()
  })

  it('returns forbiddenNames error when orgname not in array', () => {
    const validator = forbiddenNamesValidatorNonEmpty([{ orgname: 'Test Org' }])
    const ctrl = new UntypedFormControl({ orgname: 'Unknown Org' })
    const result = validator(ctrl)
    expect(result).not.toBeNull()
    expect(result!['forbiddenNames']).toBeDefined()
  })

  it('returns forbiddenNames error when array is empty', () => {
    const validator = forbiddenNamesValidatorNonEmpty([])
    const ctrl = new UntypedFormControl({ orgname: 'Org' })
    expect(validator(ctrl)).not.toBeNull()
  })

  it('handles undefined optionsArray', () => {
    const validator = forbiddenNamesValidatorNonEmpty(undefined)
    const ctrl = new UntypedFormControl({ orgname: 'Test' })
    expect(validator(ctrl)).toBeNull()
  })

  it('throws when control value is null (orgname access on null)', () => {
    const validator = forbiddenNamesValidatorNonEmpty([{ orgname: undefined }])
    const ctrl = new UntypedFormControl(null)
    expect(() => validator(ctrl)).toThrow()
  })

  it('returns error when org not found in multi-item array', () => {
    const validator = forbiddenNamesValidatorNonEmpty([{ orgname: 'A' }, { orgname: 'B' }, { orgname: 'C' }])
    const ctrl = new UntypedFormControl({ orgname: 'D' })
    expect(validator(ctrl)).not.toBeNull()
  })

  it('returns null when org found in multi-item array', () => {
    const validator = forbiddenNamesValidatorNonEmpty([{ orgname: 'A' }, { orgname: 'B' }, { orgname: 'C' }])
    const ctrl = new UntypedFormControl({ orgname: 'B' })
    expect(validator(ctrl)).toBeNull()
  })
})

// ─── Component tests ───────────────────────────────────────────────────────────

const signupDataSubject = new Subject<any>()

const makeSignupComponent = (platformId = 'browser', overrides: any = {}) => {
  const signupSvc: any = {
    updateSignupDataObservable: signupDataSubject.asObservable(),
    searchOrgs: jest.fn(() => of({ result: { response: [] } })),
    sendOtp: jest.fn(() => of({})),
    resendOtp: jest.fn(() => of({ result: { response: 'SUCCESS' } })),
    verifyOTP: jest.fn(() => of({ result: { response: 'SUCCESS' } })),
    getMinistryForRegistration: jest.fn(() => of({ result: { result: { data: [], totalcount: 0 } } })),
    getStateForRegistration: jest.fn(() => of({ result: { result: { data: [], totalcount: 0 } } })),
    getStateOrMinistyForRegistration: jest.fn(() => of({ result: { result: { data: [], totalcount: 0 } } })),
    ...overrides.signupSvc,
  }
  const usersService: any = {
    searchPublicDesignation: jest.fn(() => of({ result: { result: { data: [], totalcount: 0 } } })),
    ...overrides.usersService,
  }
  const loggerSvc: any = { error: jest.fn(), warn: jest.fn() }
  const configSvc: any = {
    instanceConfig: {
      telemetryConfig: { pdata: { id: 'test-portal' } },
      websitelanguages: ['en', 'hi'],
      isMultilingualEnabled: true,
    },
    ...overrides.configSvc,
  }
  const snackBar: any = { open: jest.fn() }
  const dialog: any = {
    open: jest.fn(() => ({ afterClosed: () => of(null), close: jest.fn() })),
  }
  const activatedRoute: any = {
    snapshot: {
      data: {
        positions: { data: [{ name: 'Manager' }] },
        group: { data: ['Group1', 'Group2', 'Others'] },
      },
    },
  }
  const recaptchaV3Service: any = { execute: jest.fn(() => of('token123')) }
  const router: any = { navigate: jest.fn() }
  const _document = document
  const translate: any = { setDefaultLang: jest.fn(), use: jest.fn() }
  const langtranslations: any = {
    updatelanguageSelected: jest.fn(),
    translateActualLabel: jest.fn((l: string) => l),
  }
  const http: any = { get: jest.fn(() => of('<html>zoho</html>')) }
  const sanitizer: any = { bypassSecurityTrustHtml: jest.fn((h: string) => h) }
  const eventService: any = { raiseInteractTelemetry: jest.fn(), raiseImpressionTelemetry: jest.fn() }
  const telemetrySvc: any = { impression: jest.fn() }

  return new PublicSignupComponent(
    signupSvc, usersService, loggerSvc, configSvc, snackBar, dialog,
    activatedRoute, recaptchaV3Service, router, _document, platformId,
    translate, langtranslations, http, sanitizer, eventService, telemetrySvc
  )
}

describe('PublicSignupComponent', () => {
  let component: PublicSignupComponent
  let signupSvc: any
  let snackBar: any
  let dialog: any
  let router: any

  beforeEach(() => {
    localStorage.clear()
    jest.useFakeTimers()
    jest.clearAllMocks()

    component = makeSignupComponent()
    signupSvc = (component as any).signupSvc
    snackBar = (component as any).snackBar
    dialog = (component as any).dialog
    router = (component as any).router
  })

  afterEach(() => {
    jest.useRealTimers()
    try { component.ngOnDestroy() } catch { }
  })

  it('creates', () => {
    expect(component).toBeDefined()
    expect(component.registrationFormStepOne).toBeDefined()
    expect(component.registrationFormStepTwo).toBeDefined()
  })

  it('sets websiteLanguage from localStorage in constructor', () => {
    localStorage.setItem('websiteLanguage', 'hi')
    const c = makeSignupComponent()
    expect(c.selectedLanguage).toBe('hi')
    c.ngOnDestroy()
  })

  it('defaults to en language when not set', () => {
    localStorage.removeItem('websiteLanguage')
    const c = makeSignupComponent()
    expect(localStorage.getItem('websiteLanguage')).toBe('en')
    c.ngOnDestroy()
  })

  describe('ngOnInit', () => {
    it('sets positionsOriginal from route data', () => {
      component.ngOnInit()
      expect(component.positionsOriginal).toHaveLength(1)
    })

    it('filters out Others from groupsOriginal', () => {
      component.ngOnInit()
      expect(component.groupsOriginal).not.toContain('Others')
      expect(component.groupsOriginal).toContain('Group1')
    })

    it('sets telemetryConfig from instanceConfig', () => {
      component.ngOnInit()
      expect(component.portalID).toBe('test-portal')
    })

    it('sets multiLang from websitelanguages', () => {
      component.ngOnInit()
      expect(component.multiLang).toEqual(['en', 'hi'])
    })

    it('handles null instanceConfig', () => {
      (component as any).configSvc.instanceConfig = null
      expect(() => component.ngOnInit()).not.toThrow()
    })

    it('handles null group data', () => {
      (component as any).activatedRoute.snapshot.data.group.data = null
      component.ngOnInit()
      expect(component.groupsOriginal).toEqual([])
    })
  })

  describe('typeValueStartCase getter', () => {
    it('returns start-cased type value', () => {
      component.registrationFormStepOne.get('type')!.setValue('ministry')
      const result = component.typeValueStartCase
      expect(typeof result).toBe('string')
    })
  })

  describe('typeValue getter', () => {
    it('returns current type value', () => {
      component.registrationFormStepOne.get('type')!.setValue('state')
      expect(component.typeValue).toBe('state')
    })
  })

  describe('emailVerification', () => {
    it('sets emailLengthVal false for valid email', () => {
      component.emailVerification('test@gov.in')
      expect(component.emailLengthVal).toBe(false)
    })

    it('sets emailLengthVal true for too-long local part', () => {
      const longLocal = 'a'.repeat(65)
      component.emailVerification(`${longLocal}@gov.in`)
      expect(component.emailLengthVal).toBe(true)
    })

    it('handles empty emailId', () => {
      component.emailVerification('')
      expect(component.emailLengthVal).toBe(false)
    })

    it('handles email without @ sign', () => {
      component.emailVerification('notanemail')
      expect(component.emailLengthVal).toBe(false)
    })
  })

  describe('clearValues', () => {
    it('clears organisation and heirarchyObject', () => {
      component.registrationFormStepOne.get('organisation')!.setValue('SomeOrg')
      component.heirarchyObject = { orgName: 'test' }
      component.clearValues()
      expect(component.registrationFormStepOne.get('organisation')!.value).toBe('')
      expect(component.heirarchyObject).toBeNull()
    })
  })

  describe('resetOrganisationBackup', () => {
    it('sets default N/A organisation', () => {
      component.resetOrganisationBackup()
      expect((component as any).masterData.organisationBackup[0].orgName).toBe('N/A')
    })
  })

  describe('editOrg', () => {
    it('resets org state', () => {
      component.hideOrg = true
      component.resultFetched = true
      component.editOrg()
      expect(component.hideOrg).toBe(false)
      expect(component.resultFetched).toBe(false)
    })
  })

  describe('orgClicked', () => {
    it('sets org value and heirarchyObject when event has option', () => {
      const event = { option: { value: { orgName: 'TestOrg', channel: 'tc' } } }
      component.orgClicked(event)
      expect(component.hideOrg).toBe(true)
      expect(component.registrationFormStepOne.get('organisation')!.value).toBe('TestOrg')
    })

    it('sets hideOrg false when event has no orgName', () => {
      const event = { option: { value: {} } }
      component.orgClicked(event)
      expect(component.hideOrg).toBe(false)
    })

    it('does nothing when event is falsy', () => {
      expect(() => component.orgClicked(null)).not.toThrow()
    })
  })

  describe('sendOtp', () => {
    it('calls signupSvc.sendOtp with valid mobile', () => {
      component.registrationFormStepTwo.get('mobile')!.setValue('9876543210')
      component.sendOtp()
      expect(signupSvc.sendOtp).toHaveBeenCalledWith('9876543210', 'phone')
    })

    it('shows snackBar for invalid mobile', () => {
      component.registrationFormStepTwo.get('mobile')!.setValue('')
      component.sendOtp()
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows snackBar on sendOtp error', () => {
      signupSvc.sendOtp.mockReturnValue(throwError({ error: { params: { errmsg: 'OTP failed' } } }))
      component.registrationFormStepTwo.get('mobile')!.setValue('9876543210')
      component.sendOtp()
      expect(snackBar.open).toHaveBeenCalled()
    })
  })

  describe('sendOtpEmail', () => {
    it('calls signupSvc.sendOtp with valid email', () => {
      component.registrationFormStepOne.get('email')!.setValue('test@gov.in')
      component.sendOtpEmail()
      expect(signupSvc.sendOtp).toHaveBeenCalledWith('test@gov.in', 'email')
    })

    it('shows snackBar for invalid email', () => {
      component.registrationFormStepOne.get('email')!.setValue('')
      component.sendOtpEmail()
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows snackBar on sendOtpEmail error', () => {
      signupSvc.sendOtp.mockReturnValue(throwError({ error: { params: { errmsg: 'OTP failed' } } }))
      component.registrationFormStepOne.get('email')!.setValue('test@gov.in')
      component.sendOtpEmail()
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows specific domain error when errmsg is present', () => {
      signupSvc.sendOtp.mockReturnValue(throwError({ error: { params: { errmsg: 'domain not found' } } }))
      component.registrationFormStepOne.get('email')!.setValue('test@gov.in')
      component.sendOtpEmail()
      expect(snackBar.open).toHaveBeenCalledWith(expect.stringContaining('department'))
    })
  })

  describe('resendOTP', () => {
    it('calls signupSvc.resendOtp for valid mobile', () => {
      component.registrationFormStepTwo.get('mobile')!.setValue('9876543210')
      component.resendOTP()
      expect(signupSvc.resendOtp).toHaveBeenCalled()
    })

    it('shows snackBar for invalid mobile', () => {
      component.registrationFormStepTwo.get('mobile')!.setValue('')
      component.resendOTP()
      expect(snackBar.open).toHaveBeenCalled()
    })
  })

  describe('resendOTPEmail', () => {
    it('calls signupSvc.resendOtp for valid email', () => {
      component.registrationFormStepOne.get('email')!.setValue('test@gov.in')
      component.resendOTPEmail()
      expect(signupSvc.resendOtp).toHaveBeenCalled()
    })

    it('shows snackBar for invalid email', () => {
      component.registrationFormStepOne.get('email')!.setValue('')
      component.resendOTPEmail()
      expect(snackBar.open).toHaveBeenCalled()
    })
  })

  describe('verifyOtp', () => {
    beforeEach(() => {
      component.registrationFormStepTwo.get('mobile')!.setValue('9876543210')
    })

    it('verifies mobile OTP on success', () => {
      const otp = { value: '1234' }
      component.verifyOtp(otp)
      expect(signupSvc.verifyOTP).toHaveBeenCalledWith('1234', '9876543210', 'phone')
      expect(component.isMobileVerified).toBe(true)
    })

    it('shows snackBar for short OTP', () => {
      component.verifyOtp({ value: '12' })
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows snackBar when otp is null', () => {
      component.verifyOtp({ value: null })
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows snackBar on verifyOTP error', () => {
      signupSvc.verifyOTP.mockReturnValue(throwError({ error: { params: { errmsg: 'Invalid OTP' } } }))
      component.verifyOtp({ value: '1234' })
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('disables verify button on 0 remaining attempts', () => {
      signupSvc.verifyOTP.mockReturnValue(throwError({ error: { result: { remainingAttempt: 0 } } }))
      component.verifyOtp({ value: '1234' })
      expect(component.disableVerifyBtn).toBe(true)
    })
  })

  describe('verifyOtpEmail', () => {
    beforeEach(() => {
      component.registrationFormStepOne.get('email')!.setValue('test@gov.in')
    })

    it('verifies email OTP on success', () => {
      const otp = { value: '5678' }
      component.verifyOtpEmail(otp)
      expect(signupSvc.verifyOTP).toHaveBeenCalledWith('5678', 'test@gov.in', 'email')
      expect(component.isEmailVerified).toBe(true)
    })

    it('shows snackBar for short OTP', () => {
      component.verifyOtpEmail({ value: '12' })
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('shows snackBar when otp is null', () => {
      component.verifyOtpEmail({ value: null })
      expect(snackBar.open).toHaveBeenCalled()
    })
  })

  describe('openDialog', () => {
    it('opens SignupSuccessDialogueComponent', () => {
      component.openDialog()
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('termsAndConditionClick', () => {
    it('opens TermsAndConditionComponent', () => {
      component.termsAndConditionClick()
      expect(dialog.open).toHaveBeenCalled()
    })

    it('sets confirmTerms when dialog returns value', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      component.termsAndConditionClick()
      expect(component.confirmTerms).toBe(true)
    })
  })

  describe('translateLabels', () => {
    it('calls translateActualLabel', () => {
      const result = component.translateLabels('testKey', 'common')
      expect(result).toBe('testKey')
    })
  })

  describe('selectLanguage', () => {
    it('updates selectedLanguage and localStorage', () => {
      component.selectLanguage('hi')
      expect(component.selectedLanguage).toBe('hi')
      expect(localStorage.getItem('websiteLanguage')).toBe('hi')
    })
  })

  describe('navigateTo', () => {
    it('navigates to /public/request with param', () => {
      component.navigateTo('ministry')
      expect(router.navigate).toHaveBeenCalledWith(
        ['/public/request'],
        expect.objectContaining({ queryParams: { type: 'ministry' } })
      )
    })
  })

  describe('numericOnly', () => {
    it('returns true for digit key', () => {
      expect(component.numericOnly({ key: '5' })).toBe(true)
    })

    it('returns false for non-digit key', () => {
      expect(component.numericOnly({ key: 'a' })).toBe(false)
    })
  })

  describe('getZohoForm', () => {
    it('opens ZohoDialogComponent', () => {
      component.getZohoForm()
      expect(dialog.open).toHaveBeenCalled()
      jest.runAllTimers()
    })
  })

  describe('displayFn helpers', () => {
    it('displayFn returns channel', () => {
      expect((component as any).displayFn({ channel: 'TestCh' })).toBe('TestCh')
    })

    it('displayFn returns undefined for null', () => {
      expect((component as any).displayFn(null)).toBeUndefined()
    })

    it('displayFnPosition returns name', () => {
      expect((component as any).displayFnPosition({ name: 'Manager' })).toBe('Manager')
    })

    it('displayFnGroup returns value', () => {
      expect((component as any).displayFnGroup('GroupA')).toBe('GroupA')
    })

    it('displayFnOrg returns orgName', () => {
      expect((component as any).displayFnOrg({ orgName: 'MyOrg' })).toBe('MyOrg')
    })

    it('displayFnOrg returns empty string for null', () => {
      expect((component as any).displayFnOrg(null)).toBe('')
    })
  })

  describe('filterOrgsSearch', () => {
    it('sets filteredOrgList from search result', () => {
      signupSvc.searchOrgs = jest.fn(() => of({
        result: { response: [{ orgName: 'TestOrg' }, { orgName: 'AnotherOrg' }] },
      }));
      (component as any).signupSvc = signupSvc
      component.filterOrgsSearch('test')
      expect(component.resultFetched).toBe(true)
    })

    it('shows snackBar on filterOrgs error', () => {
      signupSvc.searchOrgs = jest.fn(() => throwError({ error: { params: { errmsg: 'Search failed' } } }));
      (component as any).signupSvc = signupSvc
      component.filterOrgsSearch('test')
      expect(snackBar.open).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('removes cs-recaptcha class in browser', () => {
      document.body.classList.add('cs-recaptcha')
      component.ngOnDestroy()
      expect(document.body.classList.contains('cs-recaptcha')).toBe(false)
    })

    it('does not throw in non-browser platform', () => {
      const c = makeSignupComponent('server')
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })

  describe('startCountDown', () => {
    it('decrements timeLeftforOTP', () => {
      component.OTP_TIMER = 3
      component.startCountDown()
      expect(component.timeLeftforOTP).toBe(3)
      jest.advanceTimersByTime(1000)
      expect(component.timeLeftforOTP).toBe(2)
      if (component.timerSubscription) component.timerSubscription.unsubscribe()
    })
  })

  describe('startCountDownEmail', () => {
    it('decrements timeLeftforOTPEmail', () => {
      component.OTP_TIMER_EMAIL = 3
      component.startCountDownEmail()
      expect(component.timeLeftforOTPEmail).toBe(3)
      jest.advanceTimersByTime(1000)
      if (component.timerSubscriptionEmail) component.timerSubscriptionEmail.unsubscribe()
    })
  })

  describe('getDesignation', () => {
    it('calls searchPublicDesignation', () => {
      component.ngOnInit()
      expect((component as any).usersService.searchPublicDesignation).toHaveBeenCalled()
    })

    it('handles error from searchPublicDesignation', () => {
      (component as any).usersService.searchPublicDesignation = jest.fn(() => throwError({ error: 'failed' }));
      (component as any).designationInitInProgress = false;
      (component as any).isLoadingMoreDesignations = false
      expect(() => component.getDesignation()).not.toThrow()
    })
  })

  describe('checkCurrentDesignationPresent', () => {
    it('adds missing designation to list', () => {
      (component as any).masterData.designation = [{ name: 'Manager' }]
      component.registrationFormStepOne.get('position')!.setValue('Director')
      component.checkCurrentDesignationPresent()
      expect((component as any).masterData.designation.some((d: any) => d.name === 'Director')).toBe(true)
    })

    it('does nothing when designation already present', () => {
      (component as any).masterData.designation = [{ name: 'Manager' }]
      component.registrationFormStepOne.get('position')!.setValue('Manager')
      component.checkCurrentDesignationPresent()
      expect((component as any).masterData.designation).toHaveLength(1)
    })
  })

  describe('confirmChange', () => {
    it('toggles confirm flag', () => {
      component.confirm = false;
      (component as any).confirmChange()
      expect(component.confirm).toBe(true)
    })
  })

  describe('confirmTermsChange', () => {
    it('toggles confirmTerms flag', () => {
      component.confirmTerms = false;
      (component as any).confirmTermsChange()
      expect(component.confirmTerms).toBe(true)
    })
  })

  describe('signup', () => {
    it('calls recaptchaV3Service.execute', () => {
      signupSvc.register = jest.fn(() => of({}))
      component.registrationFormStepOne.get('type')!.setValue('ministry')
      component.heirarchyObject = { identifier: 'org1', orgName: 'TestOrg', channel: 'ch', sbOrgType: 'MINISTRY', sbOrgSubType: '' }
      component.signup()
      expect(signupSvc.register).toHaveBeenCalled()
    })

    it('shows snackBar on recaptcha error', () => {
      (component as any).recaptchaV3Service.execute = jest.fn(() => throwError(new Error('recaptcha failed')))
      component.heirarchyObject = { identifier: 'org1', orgName: 'TestOrg', channel: 'ch', sbOrgType: 'MINISTRY', sbOrgSubType: '' }
      component.signup()
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('handles signup register error', () => {
      signupSvc.register = jest.fn(() => throwError({ error: { params: { errmsg: 'Signup error' } } }))
      component.registrationFormStepOne.get('type')!.setValue('ministry')
      component.heirarchyObject = { identifier: 'org1', orgName: 'TestOrg', channel: 'ch', sbOrgType: 'MINISTRY', sbOrgSubType: '' }
      component.signup()
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('handles N/A org for ministry type', () => {
      signupSvc.register = jest.fn(() => of({}))
      component.registrationFormStepOne.get('type')!.setValue('ministry')
      component.registrationFormStepOne.get('ministry')!.setValue('min1')
      component.heirarchyObject = { orgName: 'N/A' };
      (component as any).currentMinistry = { orgName: 'Govt', channel: 'gov', sbOrgType: 'MINISTRY', sbOrgSubType: '' }
      component.signup()
      expect(signupSvc.register).toHaveBeenCalled()
    })

    it('handles state type with N/A org and no department', () => {
      signupSvc.register = jest.fn(() => of({}))
      component.registrationFormStepOne.get('type')!.setValue('state')
      component.registrationFormStepOne.get('state')!.setValue('state1')
      component.registrationFormStepOne.get('department')!.setValue('-1')
      component.heirarchyObject = { orgName: 'N/A' };
      (component as any).currentMinistry = { orgName: 'StateGov', channel: 'stgov', sbOrgType: 'STATE', sbOrgSubType: '' }
      component.signup()
      expect(signupSvc.register).toHaveBeenCalled()
    })
  })

  describe('mdoRedirect', () => {
    it('sets window.location.href', () => {
      const originalHref = window.location.href
      Object.defineProperty(window, 'location', { writable: true, value: { href: '' } })
      component.mdoRedirect()
      expect(window.location.href).toContain('mdoList')
      Object.defineProperty(window, 'location', { writable: true, value: { href: originalHref } })
    })
  })

  describe('designationSearch', () => {
    it('calls getDesignation for non-empty search', () => {
      jest.spyOn(component, 'getDesignation').mockImplementation(jest.fn())
      component.designationSearch({ target: { value: 'manager' } })
      expect(component.getDesignation).toHaveBeenCalledWith('manager', 0)
    })

    it('resets designations for empty search', () => {
      (component as any).masterData.designationBackup = [{ name: 'A' }, { name: 'B' }]
      jest.spyOn(component, 'checkCurrentDesignationPresent').mockImplementation(jest.fn())
      component.designationSearch({ target: { value: '' } })
      expect(component.checkCurrentDesignationPresent).toHaveBeenCalled()
    })

    it('returns early when loading', () => {
      jest.spyOn(component, 'getDesignation').mockImplementation(jest.fn());
      (component as any).isLoadingMoreDesignations = true
      component.designationSearch({ target: { value: 'test' } })
      expect(component.getDesignation).not.toHaveBeenCalled()
    })
  })

  describe('onDesignationDropdownClosed', () => {
    it('does not throw', () => {
      expect(() => component.onDesignationDropdownClosed()).not.toThrow()
      jest.runAllTimers()
    })
  })

  describe('getDesignation with loaded data', () => {
    it('appends to designationBackup on second page load', () => {
      (component as any).masterData.designationBackup = [{ name: 'Manager', status: 'Active' }];
      (component as any).usersService.searchPublicDesignation = jest.fn(() => of({
        result: { result: { data: [{ designation: 'Director', status: 'Active' }], totalcount: 5 } }
      }))
      component.getDesignation(undefined, 10)
      expect((component as any).masterData.designationBackup.length).toBeGreaterThan(0)
    })

    it('sets noMoreLegacyDesignations when all loaded', () => {
      (component as any).usersService.searchPublicDesignation = jest.fn(() => of({
        result: { result: { data: [{ designation: 'Manager', status: 'Active' }], totalcount: 1 } }
      }))
      component.getDesignation(undefined, 0)
      expect((component as any).noMoreLegacyDesignations).toBe(true)
    })

    it('sets noMoreLegacyDesignations when empty result', () => {
      (component as any).usersService.searchPublicDesignation = jest.fn(() => of({
        result: { result: { data: [], totalcount: 5 } }
      }))
      component.getDesignation(undefined, 0)
      expect((component as any).noMoreLegacyDesignations).toBe(true)
    })
  })
})
