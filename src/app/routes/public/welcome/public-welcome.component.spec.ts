import {
  PublicWelcomeComponent,
  forbiddenNamesValidator,
  forbiddenNamesValidatorNonEmpty,
  forbiddenNamesValidatorPosition,
} from './public-welcome.component'
import { UntypedFormControl } from '@angular/forms'
import { of, throwError } from 'rxjs'

jest.mock('src/app/services/init.service', () => ({
  InitService: class { init = jest.fn(() => Promise.resolve()) },
}), { virtual: true })

jest.mock('src/environments/environment', () => ({
  environment: { resendOTPTIme: 120 },
}), { virtual: true })
jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash')
  return { __esModule: true, default: actual, ...actual }
}, { virtual: false })

const buildMocks = (usrOverrides: any = {}) => {
  const usr = {
    userId: 'u1',
    firstName: 'Alice',
    lastName: 'Wonder',
    email: 'alice@gov.in',
    phone: '',
    isUpdateRequired: true,
    ...usrOverrides,
  }

  const welcomeSignupSvc = {
    register: jest.fn(() => of({ result: 'SUCCESS' })),
  }
  const signupSvc = {
    searchOrgs: jest.fn(() => of({ result: { response: [] } })),
  }
  const loggerSvc = { error: jest.fn() }
  const configSvc = {
    instanceConfig: {
      telemetryConfig: { pdata: { id: 'portal' } },
    },
    userProfileV2: { id: 'u1' } as any,
    updateGlobalProfile: jest.fn(),
  }
  const snackBar = { open: jest.fn() }
  const activatedRoute = {
    snapshot: {
      data: {
        userData: { data: usr },
        group: { data: ['Manager', 'Developer', 'Others'] },
      },
    },
  }
  const router = { navigate: jest.fn() }
  const initSvc = { init: jest.fn(() => Promise.resolve()) }

  return { welcomeSignupSvc, signupSvc, loggerSvc, configSvc, snackBar, activatedRoute, router, initSvc, usr }
}

const makeComponent = (mocks: any) =>
  new (PublicWelcomeComponent as any)(
    mocks.welcomeSignupSvc,
    mocks.signupSvc,
    mocks.loggerSvc,
    mocks.configSvc,
    mocks.snackBar,
    mocks.activatedRoute,
    mocks.router,
    mocks.initSvc,
  )

// ── Validator helpers ─────────────────────────────────────────────────────────
describe('forbiddenNamesValidator', () => {
  it('returns null for null optionsArray', () => {
    const fn = forbiddenNamesValidator(null)
    expect(fn(new UntypedFormControl('any'))).toBeNull()
  })

  it('returns null when orgName matches existing option', () => {
    const options = [{ orgName: 'DOPT' }]
    const fn = forbiddenNamesValidator(options)
    const ctrl = new UntypedFormControl({ orgName: 'DOPT' })
    expect(fn(ctrl)).toBeNull()
  })

  it('returns error when orgName does not match any option', () => {
    const options = [{ orgName: 'DOPT' }]
    const fn = forbiddenNamesValidator(options)
    const ctrl = new UntypedFormControl({ orgName: 'Unknown' })
    expect(fn(ctrl)).toEqual({ forbiddenNames: { value: 'Unknown' } })
  })
})

describe('forbiddenNamesValidatorNonEmpty', () => {
  it('returns null for null optionsArray', () => {
    const fn = forbiddenNamesValidatorNonEmpty(null)
    expect(fn(new UntypedFormControl('any'))).toBeNull()
  })

  it('returns null when match found', () => {
    const fn = forbiddenNamesValidatorNonEmpty([{ orgName: 'DOPT' }])
    expect(fn(new UntypedFormControl({ orgName: 'DOPT' }))).toBeNull()
  })

  it('returns error when no match', () => {
    const fn = forbiddenNamesValidatorNonEmpty([{ orgName: 'DOPT' }])
    expect(fn(new UntypedFormControl({ orgName: 'OTHER' }))).toEqual({
      forbiddenNames: { value: 'OTHER' },
    })
  })
})

describe('forbiddenNamesValidatorPosition', () => {
  it('returns null for null optionsArray', () => {
    const fn = forbiddenNamesValidatorPosition(null)
    expect(fn(new UntypedFormControl('any'))).toBeNull()
  })

  it('returns null when name matches', () => {
    const fn = forbiddenNamesValidatorPosition([{ name: 'Manager' }])
    expect(fn(new UntypedFormControl({ name: 'Manager' }))).toBeNull()
  })

  it('returns error when no name match', () => {
    const fn = forbiddenNamesValidatorPosition([{ name: 'Manager' }])
    expect(fn(new UntypedFormControl({ name: 'Unknown' }))).toEqual({
      forbiddenNames: { value: 'Unknown' },
    })
  })
})

// ── PublicWelcomeComponent ────────────────────────────────────────────────────
describe('PublicWelcomeComponent', () => {
  let component: PublicWelcomeComponent
  let mocks: any

  beforeEach(() => {
    jest.clearAllMocks()
    mocks = buildMocks()
    component = makeComponent(mocks)
  })

  // ── Construction ────────────────────────────────────────────────────────
  describe('construction', () => {
    it('creates an instance', () => {
      expect(component).toBeDefined()
    })

    it('calls init() when isUpdateRequired is true and userProfileV2 is set', () => {
      // registrationForm is built synchronously when userProfileV2 is truthy
      expect(component.registrationForm).toBeDefined()
    })

    it('takes async path when isUpdateRequired is true and userProfileV2 is null', () => {
      const m = buildMocks()
      m.configSvc.userProfileV2 = null
      const c = makeComponent(m)
      // constructor returns without error; fetch() is called asynchronously
      expect(c).toBeDefined()
    })

    it('navigates to /page/home when isUpdateRequired is false and userProfileV2 set', () => {
      const m = buildMocks({ isUpdateRequired: false })
      m.configSvc.userProfileV2 = { id: 'u1' } as any // already loaded
      makeComponent(m)
      expect(m.router.navigate).toHaveBeenCalledWith(['/page/home'])
    })

    it('OTP_TIMER is set from environment.resendOTPTIme', () => {
      expect(component.OTP_TIMER).toBe(120)
    })
  })

  // ── init() ──────────────────────────────────────────────────────────────
  describe('init()', () => {
    it('builds registrationForm with firstname field', () => {
      expect(component.registrationForm.get('firstname')).toBeDefined()
    })

    it('sets isEmailVerified true when user has email', () => {
      expect(component.isEmailVerified).toBe(true)
    })

    it('sets isEmailVerified false when user has no email', () => {
      const m = buildMocks({ email: '' })
      const c = makeComponent(m)
      expect(c.isEmailVerified).toBe(false)
    })

    it('sets isMobileVerified true when user has phone', () => {
      const m = buildMocks({ phone: '9876543210' })
      const c = makeComponent(m)
      expect(c.isMobileVerified).toBe(true)
    })

    it('sets isMobileVerified false when no phone', () => {
      expect(component.isMobileVerified).toBe(false)
    })

    it('sets firstname from usr.firstName + lastName', () => {
      expect(component.registrationForm.get('firstname')!.value).toBe('Alice Wonder')
    })
  })

  // ── confirmChange() ──────────────────────────────────────────────────────
  describe('confirmChange()', () => {
    it('toggles confirm and updates confirmBox in form', () => {
      expect(component.confirm).toBe(false)
      component.confirmChange()
      expect(component.confirm).toBe(true)
      expect(component.registrationForm.get('confirmBox')!.value).toBe(true)

      component.confirmChange()
      expect(component.confirm).toBe(false)
      expect(component.registrationForm.get('confirmBox')!.value).toBe(false)
    })
  })

  // ── typeValue / typeValueStartCase ────────────────────────────────────────
  describe('typeValue', () => {
    it('returns the current form type value', () => {
      expect(component.typeValue).toBe('ministry')
    })
  })

  describe('typeValueStartCase', () => {
    it('returns start-cased type value', () => {
      expect(component.typeValueStartCase).toBe('Ministry')
    })
  })

  // ── displayFn / displayFnGroup / displayFnState ───────────────────────────
  describe('displayFn', () => {
    it('returns channel when value has channel', () => {
      expect(component.displayFn({ channel: 'ch1' })).toBe('ch1')
    })

    it('returns undefined for null', () => {
      expect(component.displayFn(null)).toBeUndefined()
    })
  })

  describe('displayFnGroup', () => {
    it('returns value itself', () => {
      expect(component.displayFnGroup('Manager')).toBe('Manager')
    })

    it('returns undefined for null', () => {
      expect(component.displayFnGroup(null)).toBeUndefined()
    })
  })

  describe('displayFnState', () => {
    it('returns orgName when value has orgName', () => {
      expect(component.displayFnState({ orgName: 'DOPT' })).toBe('DOPT')
    })

    it('returns undefined for null', () => {
      expect(component.displayFnState(null)).toBeUndefined()
    })
  })

  // ── editOrg ───────────────────────────────────────────────────────────────
  describe('editOrg()', () => {
    it('resets hideOrg, resultFetched, searching, and clears heirarchyObject', () => {
      component.hideOrg = true
      component.resultFetched = true
      component.searching = true
      component.heirarchyObject = { orgName: 'X' }
      component.editOrg()
      expect(component.hideOrg).toBe(false)
      expect(component.resultFetched).toBe(false)
      expect(component.searching).toBe(false)
      expect(component.heirarchyObject).toBeNull()
    })
  })

  // ── clearValues ───────────────────────────────────────────────────────────
  describe('clearValues()', () => {
    it('resets organisation control value', () => {
      component.registrationForm.get('organisation')!.setValue('DOPT')
      component.clearValues()
      expect(component.registrationForm.get('organisation')!.value).toBe('')
    })

    it('clears heirarchyObject', () => {
      component.heirarchyObject = { orgName: 'DOPT' }
      component.clearValues()
      expect(component.heirarchyObject).toBeNull()
    })
  })

  // ── orgClicked ────────────────────────────────────────────────────────────
  describe('orgClicked()', () => {
    it('sets hideOrg true when event has orgName', () => {
      component.orgClicked({ option: { value: { orgName: 'DOPT', channel: 'dopt' } } })
      expect(component.hideOrg).toBe(true)
      expect(component.heirarchyObject.orgName).toBe('DOPT')
    })

    it('sets hideOrg false when event lacks orgName', () => {
      component.orgClicked({ option: { value: {} } })
      expect(component.hideOrg).toBe(false)
    })
  })

  // ── searchOrgs ────────────────────────────────────────────────────────────
  describe('searchOrgs()', () => {
    it('opens snackbar and sets searching false when no searchValue', async () => {
      await component.searchOrgs('')
      expect(mocks.snackBar.open).toHaveBeenCalledWith(
        'Please enter organisation to search', 'X', expect.any(Object)
      )
      expect(component.searching).toBe(false)
    })
  })

  // ── filterOrgsSearch ──────────────────────────────────────────────────────
  describe('filterOrgsSearch()', () => {
    it('calls searchOrgs API and sets filteredOrgList', () => {
      mocks.signupSvc.searchOrgs.mockReturnValue(
        of({ result: { response: [{ orgName: 'DOPT' }, { orgName: 'Other Org' }] } })
      )
      component.filterOrgsSearch('dopt')
      expect(mocks.signupSvc.searchOrgs).toHaveBeenCalledWith('dopt', 'ministry')
      // DOPT matches 'dopt', Other Org does not
      expect(component.filteredOrgList.length).toBe(1)
      expect(component.filteredOrgList[0].orgName).toBe('DOPT')
    })

    it('opens snackbar on API error with errmsg', () => {
      mocks.signupSvc.searchOrgs.mockReturnValue(
        throwError({ error: { params: { errmsg: 'Custom error' } } })
      )
      component.filterOrgsSearch('xyz')
      expect(mocks.snackBar.open).toHaveBeenCalledWith('Custom error', 'X', expect.any(Object))
    })

    it('opens generic snackbar on API error without errmsg', () => {
      mocks.signupSvc.searchOrgs.mockReturnValue(throwError({}))
      component.filterOrgsSearch('xyz')
      expect(mocks.snackBar.open).toHaveBeenCalledWith(
        'Something went wrong, please try again later!', 'X', expect.any(Object)
      )
    })
  })

  // ── signup ────────────────────────────────────────────────────────────────
  describe('signup()', () => {
    it('calls welcomeSignupSvc.register and navigates on success', () => {
      component.heirarchyObject = {
        orgName: 'DOPT',
        channel: 'dopt',
        sbOrgId: 'o1',
        mapId: 'm1',
        sbRootOrgId: 'r1',
        sbOrgType: 'Ministry',
        sbOrgSubType: 'Dept',
      }
      component.registrationForm.patchValue({
        firstname: 'Alice Wonder',
        mobile: '9876543210',
        group: 'Manager',
      })
      mocks.welcomeSignupSvc.register.mockReturnValue(of({ result: 'SUCCESS' }))
      component.signup()
      expect(mocks.welcomeSignupSvc.register).toHaveBeenCalled()
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/page/home'])
      expect(component.disableBtn).toBe(false)
    })

    it('shows snackbar and resets disableBtn on error', () => {
      component.heirarchyObject = {
        orgName: 'DOPT',
        channel: 'dopt',
        sbOrgId: 'o1',
        mapId: '',
        sbRootOrgId: 'r1',
        sbOrgType: '',
        sbOrgSubType: '',
      }
      mocks.welcomeSignupSvc.register.mockReturnValue(
        throwError({ error: { params: { errmsg: 'Server error' } } })
      )
      component.signup()
      expect(mocks.snackBar.open).toHaveBeenCalledWith('Server error', 'X', expect.any(Object))
      expect(component.disableBtn).toBe(false)
    })
  })

  // ── startCountDown ────────────────────────────────────────────────────────
  describe('startCountDown()', () => {
    it('sets timeLeftforOTP to OTP_TIMER and creates subscription', done => {
      jest.useFakeTimers()
      component.startCountDown()
      expect(component.timeLeftforOTP).toBe(120)
      expect(component.timerSubscription).toBeDefined()
      jest.useRealTimers()
      done()
    })
  })

  // ── ngOnDestroy ───────────────────────────────────────────────────────────
  describe('ngOnDestroy()', () => {
    it('unsubscribes subscriptionContact if active', () => {
      const sub = { unsubscribe: jest.fn() }
        ; (component as any).subscriptionContact = sub
      component.ngOnDestroy()
      expect(sub.unsubscribe).toHaveBeenCalled()
    })

    it('does not throw when subscriptionContact is null', () => {
      ; (component as any).subscriptionContact = null
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
