import { RootComponent } from './root.component'
import { of } from 'rxjs'
import { NavigationEnd } from '@angular/router'

jest.mock('../../../environments/environment', () => ({
  environment: { production: false },
}))

// Heavy 3rd party / Angular dependencies are mocked
jest.mock('@project-sunbird/client-services', () => ({
  CsModule: { instance: { init: jest.fn() } },
}))

jest.mock('@sunbird-cb/collection', () => ({
  BtnPageBackService: class { initialize = jest.fn() },
}), { virtual: true })

jest.mock('@sunbird-cb/utils-v2', () => ({
  ConfigurationsService: class { },
  TelemetryService: class { },
  ValueService: class { },
  UtilityService: class { },
  EventService: class { },
  WsEvents: {
    WsEventType: { Telemetry: 'Telemetry' },
    WsEventLogLevel: { Info: 'Info' },
    EnumTelemetrySubType: { Loaded: 'Loaded' },
  },
  NsInstanceConfig: {},
}), { virtual: true })

jest.mock('src/app/shared/url.service', () => ({
  UrlService: class { setPreviousUrl = jest.fn() },
}), { virtual: true })

jest.mock('src/app/services/igot-ai.service', () => ({
  iGOTAIService: class { iGOTAIConfigReadData = jest.fn() },
}), { virtual: true })

jest.mock('src/app/services/common-data.service', () => ({
  CommonDataService: class { mandatoryDetails = jest.fn() },
}), { virtual: true })

jest.mock('src/app/services/mobile-apps.service', () => ({
  MobileAppsService: class { init = jest.fn() },
}), { virtual: true })

jest.mock('./root.service', () => ({
  RootService: class { getCookie = jest.fn() },
}), { virtual: true })

jest.mock('../dialog-confirm/dialog-confirm.component', () => ({
  DialogConfirmComponent: class { },
}), { virtual: true })

jest.mock('@angular/material/legacy-dialog', () => ({
  MatLegacyDialog: class { open = jest.fn() },
}), { virtual: true })

jest.mock('@angular/service-worker', () => ({
  SwUpdate: class {
    isEnabled = false
    available = of()
    checkForUpdate = jest.fn()
    activateUpdate = jest.fn(() => Promise.resolve())
  },
}))

const buildMocks = () => {
  const router = {
    events: of(new NavigationEnd(1, '/page/home', '/page/home')),
    navigateByUrl: jest.fn(),
    navigate: jest.fn(),
    url: '/page/home',
    routerState: {
      firstChild: jest.fn(() => null),
    },
  }
  const route = {
    queryParams: of({}),
    snapshot: {
      fragment: null,
      root: { firstChild: null },
      queryParams: { primaryCategory: '' },
    },
  }
  const appRef = {
    isStable: of(true),
  }
  const swUpdate = {
    isEnabled: false,
    available: of(),
    checkForUpdate: jest.fn(),
    activateUpdate: jest.fn(() => Promise.resolve()),
  }
  const dialog = {
    open: jest.fn(() => ({ afterClosed: () => of(false) })),
  }
  const http = {
    get: jest.fn(() => of({ sections: [] })),
  }
  const configSvc = {
    sitePath: '/assets',
    unMappedUser: {
      id: 'u1',
      rootOrgId: 'org1',
      profileDetails: {
        profileStatus: 'Active',
        employmentDetails: { departmentName: 'IT' },
        get_started_tour: null,
      },
    },
    userProfile: { userId: 'u1' },
    overrideThemeChanges: { isEnabled: false },
    updateTourGuide: of(false),
    updateTourGuideMethod: jest.fn(),
    iGOTAIConfig: null,
  }
  const valueSvc = { isXSmall$: of(false) }
  const telemetrySvc = { impression: jest.fn() }
  const eventSvc = { dispatchEvent: jest.fn() }
  const mobileAppsSvc = {
    init: jest.fn(),
    mobileTopHeaderVisibilityStatus: of(true),
    clearGlobalSearchForHomePage: { next: jest.fn() },
  }
  const rootSvc = {
    getCookie: jest.fn(() => null),
    showNavbarDisplay$: of(true),
    iGOTAIChatHistory: [],
    iGOTAIConfigReadData: jest.fn(() => of({ web: {} })),
  }
  const btnBackSvc = { initialize: jest.fn() }
  const changeDetector = { detectChanges: jest.fn() }
  const utilitySvc = {
    setRouteData: jest.fn(),
    routeData: { pageId: '', module: '' },
  }
  const urlService = { setPreviousUrl: jest.fn() }
  const iGOTAIService = {
    iGOTAIConfigReadData: jest.fn(() => of({ web: {}, error: null })),
  }
  const commonDataSvc = {
    mandatoryDetails: jest.fn(),
  }

  return {
    router, route, appRef, swUpdate, dialog, http, configSvc,
    valueSvc, telemetrySvc, eventSvc, mobileAppsSvc, rootSvc,
    btnBackSvc, changeDetector, utilitySvc, urlService,
    iGOTAIService, commonDataSvc,
  }
}

const makeComponent = (m: any) =>
  new (RootComponent as any)(
    m.router,
    m.route,
    m.appRef,
    m.swUpdate,
    m.dialog,
    m.http,
    m.configSvc,
    m.valueSvc,
    m.telemetrySvc,
    m.eventSvc,
    m.mobileAppsSvc,
    m.rootSvc,
    m.btnBackSvc,
    m.changeDetector,
    m.utilitySvc,
    m.urlService,
    m.iGOTAIService,
    m.commonDataSvc,
  )

describe('RootComponent', () => {
  let component: RootComponent
  let mocks: any

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mocks = buildMocks()

    // Stub document.getElementById to avoid JSDOM issues
    jest.spyOn(document, 'getElementById').mockReturnValue(
      Object.assign(document.createElement('div'), { classList: { add: jest.fn(), remove: jest.fn() } })
    )

    component = makeComponent(mocks)
  })

  // ── Construction ──────────────────────────────────────────────────────────
  describe('construction', () => {
    it('creates the component', () => {
      expect(component).toBeDefined()
    })

    it('initialises showNavbar to true', () => {
      expect(component.showNavbar).toBe(true)
    })

    it('initialises routeChangeInProgress to false', () => {
      expect(component.routeChangeInProgress).toBe(false)
    })

    it('initialises iGOTAIConfigLoaded to false', () => {
      expect(component.iGOTAIConfigLoaded).toBe(false)
    })

    it('sets hideHeaderAndFooter true for privacy-policy path', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/public/privacy-policy', href: 'http://localhost/public/privacy-policy' },
        writable: true,
      })
      const m = buildMocks()
      const c = makeComponent(m)
      expect(c.hideHeaderAndFooter).toBe(true)
      Object.defineProperty(window, 'location', {
        value: { pathname: '/', href: 'http://localhost/' },
        writable: true,
      })
    })

    it('initialises loggedinUser based on configSvc.userProfile', () => {
      expect(component.loggedinUser).toBe(true)
    })
  })

  // ── navBarRequired ────────────────────────────────────────────────────────
  describe('navBarRequired getter', () => {
    it('returns isNavBarRequired', () => {
      component.isNavBarRequired = false
      expect(component.navBarRequired).toBe(false)
      component.isNavBarRequired = true
      expect(component.navBarRequired).toBe(true)
    })
  })

  // ── isShowNavbar ──────────────────────────────────────────────────────────
  describe('isShowNavbar getter', () => {
    it('returns showNavbar', () => {
      component.showNavbar = false
      expect(component.isShowNavbar).toBe(false)
    })
  })

  // ── isCustomHeight ────────────────────────────────────────────────────────
  describe('isCustomHeight getter', () => {
    it('returns true when pathname includes /public/home', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/public/home', href: 'http://localhost/public/home' },
        writable: true,
      })
      expect(component.isCustomHeight).toBe(true)
    })
  })

  // ── openIntro ─────────────────────────────────────────────────────────────
  describe('openIntro()', () => {
    it('does not throw', () => {
      expect(() => component.openIntro()).not.toThrow()
    })
  })

  // ── skipToMainContent ─────────────────────────────────────────────────────
  describe('skipToMainContent()', () => {
    it('focuses the skipper element', () => {
      const el = { focus: jest.fn() }
      component.skipper = { nativeElement: el } as any
      component.skipToMainContent()
      expect(el.focus).toHaveBeenCalled()
    })
  })

  // ── getHeaderFooterConfiguration ─────────────────────────────────────────
  describe('getHeaderFooterConfiguration()', () => {
    it('fetches right-nav-config and emits data', done => {
      mocks.http.get.mockReturnValue(of({ sections: ['s1'] }))
      component = makeComponent(mocks)
      component.getHeaderFooterConfiguration().subscribe(result => {
        expect(result.data).toBeTruthy()
        done()
      })
    })

    it('emits null data on error', done => {
      const { throwError } = require('rxjs')
      mocks.http.get.mockReturnValue(throwError(() => new Error('fail')))
      component = makeComponent(mocks)
      component.getHeaderFooterConfiguration().subscribe(result => {
        expect(result.data).toBeNull()
        done()
      })
    })
  })

  // ── getTourGuide ──────────────────────────────────────────────────────────
  describe('getTourGuide()', () => {
    it('returns boolean', () => {
      expect(typeof component.getTourGuide()).toBe('boolean')
    })
  })

  // ── raiseAppStartTelemetry ────────────────────────────────────────────────
  describe('raiseAppStartTelemetry()', () => {
    it('dispatches telemetry event on first call', () => {
      component.appStartRaised = false
      component.raiseAppStartTelemetry()
      expect(mocks.eventSvc.dispatchEvent).toHaveBeenCalled()
      expect(component.appStartRaised).toBe(true)
    })

    it('does not dispatch telemetry on subsequent calls', () => {
      component.appStartRaised = true
      component.raiseAppStartTelemetry()
      expect(mocks.eventSvc.dispatchEvent).not.toHaveBeenCalled()
    })
  })

  // ── getChildRouteData ─────────────────────────────────────────────────────
  describe('getChildRouteData()', () => {
    it('does not throw for null firstChild', () => {
      expect(() => component.getChildRouteData({} as any, null)).not.toThrow()
    })

    it('pushes firstChild.data to currentRouteData', () => {
      component.currentRouteData = []
      const child = { data: { pageId: '/home' }, firstChild: null }
      component.getChildRouteData({} as any, child as any)
      expect(component.currentRouteData).toContain(child.data)
    })

    it('recurses into nested firstChild', () => {
      component.currentRouteData = []
      const nested = { data: { pageId: '/nested' }, firstChild: null }
      const parent = { data: { pageId: '/parent' }, firstChild: nested }
      component.getChildRouteData({} as any, parent as any)
      expect(component.currentRouteData.length).toBe(2)
    })
  })

  // ── ngOnInit ──────────────────────────────────────────────────────────────
  describe('ngOnInit()', () => {
    it('does not throw', () => {
      expect(() => component.ngOnInit()).not.toThrow()
    })

    it('calls btnBackSvc.initialize', () => {
      component.ngOnInit()
      expect(mocks.btnBackSvc.initialize).toHaveBeenCalled()
    })

    it('calls commonDataSvc.mandatoryDetails on NavigationEnd', () => {
      component.ngOnInit()
      expect(mocks.commonDataSvc.mandatoryDetails).toHaveBeenCalled()
    })
  })

  // ── changeBg26Jan / removeBg26Jan ─────────────────────────────────────────
  describe('changeBg26Jan / removeBg26Jan', () => {
    it('changeBg26Jan does not throw', () => {
      expect(() => component.changeBg26Jan()).not.toThrow()
    })

    it('removeBg26Jan does not throw', () => {
      expect(() => component.removeBg26Jan()).not.toThrow()
    })
  })

  // ── ngAfterViewChecked ────────────────────────────────────────────────────
  describe('ngAfterViewChecked()', () => {
    it('calls changeDetector.detectChanges', () => {
      component.ngAfterViewChecked()
      expect(mocks.changeDetector.detectChanges).toHaveBeenCalled()
    })
  })
})

