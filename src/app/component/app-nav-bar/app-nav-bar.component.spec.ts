import { AppNavBarComponent } from './app-nav-bar.component'
import { Subject, of } from 'rxjs'
import { NavigationEnd } from '@angular/router'

jest.mock('@sunbird-cb/collection', () => ({
  IBtnAppsConfig: {},
  CustomTourService: class { },
  WidgetUserService: class { },
}), { virtual: true })

jest.mock('@sunbird-cb/notification', () => ({
  LibNotificationsService: class { },
}), { virtual: true })

jest.mock('src/app/services/notifications.service', () => ({
  NotificationsService: class { },
}), { virtual: true })

jest.mock('src/app/shared/url.service', () => ({
  UrlService: class { },
}), { virtual: true })

jest.mock('lodash', () => {
  const get = (obj: any, path: string, def?: any) => {
    if (!obj) return def
    const result = path.split('.').reduce((o: any, k: string) => (o && o[k] !== undefined ? o[k] : undefined), obj)
    return result !== undefined ? result : def
  }
  return { __esModule: true, default: { get }, get }
})

const mockRouterEvents = new Subject<any>()

const makeComponent = (overrides: any = {}) => {
  const mockDomSanitizer = { bypassSecurityTrustResourceUrl: jest.fn(url => url) }
  const configSvc: any = {
    restrictedFeatures: new Set<string>(),
    overrideThemeChanges: { desktop: { logoDisplayTime: 5000, animationDuration: 500 } },
    tourGuideNotifier: new Subject<boolean>(),
    openExploreMenuForMWeb: { next: jest.fn() },
    userProfile: { userId: 'u1' },
    unMappedUser: { identifier: 'u1' },
    instanceConfig: {
      logos: { appSecondary: 'logo2.png', appBottomNav: 'bottom.png' },
      showNavBarInSetup: false,
    },
    primaryNavBar: null,
    pageNavBar: null,
    primaryNavBarConfig: null,
    appsConfig: { features: { f1: {}, f2: {} } },
    rootOrg: 'org1',
    prefChangeNotifier: { next: jest.fn() },
    ...overrides,
  }
  const tourService = {
    createPopupTour: jest.fn(() => ({})),
    cancelPopupTour: jest.fn(),
  }
  const router = { events: mockRouterEvents.asObservable(), navigate: jest.fn(), navigateByUrl: jest.fn() }
  const translate = { setDefaultLang: jest.fn(), use: jest.fn() }
  const events = { raiseInteractTelemetry: jest.fn() }
  const langtranslations = { translateLabelWithoutspace: jest.fn((l: string) => l) }
  const urlService = { previousUrl$: new Subject<string>() }
  const userSvc = { fetchUserBatchList: jest.fn(() => of(null)) }
  const notificationsService = { getNotificationsData: jest.fn(() => of({ result: { unread: 3 } })) }
  const libNotificationsService = { unreadCount$: new Subject<number>() }
  const domainConfSvc = {
    getDomainAppLogo: jest.fn(() => 'logo.png'),
    getDomainRedirectPath: jest.fn(() => '/page/home'),
    isKbPortal: jest.fn(() => false),
  }

  return new AppNavBarComponent(
    mockDomSanitizer as any, configSvc, tourService as any, router as any, translate as any,
    events as any, langtranslations as any, urlService as any, userSvc as any,
    notificationsService as any, libNotificationsService as any, domainConfSvc as any
  )
}

describe('AppNavBarComponent', () => {
  let component: AppNavBarComponent

  beforeEach(() => {
    localStorage.clear()
    jest.useFakeTimers()
    component = makeComponent()
  })

  afterEach(() => {
    clearInterval(component.enrollInterval)
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('creates', () => {
    expect(component).toBeDefined()
  })

  it('sets isHelpMenuRestricted from restrictedFeatures', () => {
    const c = makeComponent({ restrictedFeatures: new Set(['helpNavBarMenu']) })
    expect(c.isHelpMenuRestricted).toBe(true)
  })

  it('reads websiteLanguage from localStorage', () => {
    localStorage.setItem('websiteLanguage', 'hi')
    const c = makeComponent()
    expect(c).toBeDefined()
  })

  describe('ngOnInit', () => {
    it('sets logoDisplayTime and calls displayLogo', () => {
      component.ngOnInit()
      expect(component.logoDisplayTime).toBe(5000)
    })

    it('sets isLoggedIn when userProfile.userId exists', () => {
      component.ngOnInit()
      expect(component.isLoggedIn).toBe(true)
    })

    it('sets appIcon from domainConfSvc', () => {
      component.ngOnInit()
      expect(component.appIcon).toBe('logo.png')
    })

    it('sets featureApps from appsConfig', () => {
      component.ngOnInit()
      expect(component.featureApps).toEqual(['f1', 'f2'])
    })

    it('sets instanceVal from rootOrg', () => {
      component.ngOnInit()
      expect(component.instanceVal).toBe('org1')
    })

    it('disableMenu set true for not-my-user igot org', () => {
      const c = makeComponent({
        unMappedUser: {
          identifier: 'u1',
          profileDetails: {
            profileStatus: 'Not-My-User',
            employmentDetails: { departmentName: 'igot' }
          }
        }
      })
      c.ngOnInit()
      expect(c.disableMenu).toBe(true)
      clearInterval(c.enrollInterval)
    })

    it('handles NavigationEnd router event for /page/home', () => {
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/page/home', '/page/home'))
      expect(component.activeRoute).toBe('home')
    })

    it('handles NavigationEnd for /page/explore', () => {
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/page/explore', '/page/explore'))
      expect(component.activeRoute).toBe('explorer')
    })

    it('handles NavigationEnd for search', () => {
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/app/globalsearch', '/app/globalsearch'))
      expect(component.activeRoute).toBe('search')
    })

    it('handles NavigationEnd for careers', () => {
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/app/careers', '/app/careers'))
      expect(component.activeRoute).toBe('Career')
    })
  })

  describe('routeSubs', () => {
    it('sets isSetUpPage for /app/setup', () => {
      component.routeSubs({ url: '/app/setup' } as any)
      expect(component.isSetUpPage).toBe(true)
    })

    it('hides navBar for /public/logout', () => {
      component.routeSubs({ url: '/public/logout' } as any)
      expect(component.showAppNavBar).toBe(false)
    })

    it('sets isPublicHomePage for /public/home', () => {
      component.routeSubs({ url: '/public/home' } as any)
      expect(component.isPublicHomePage).toBe(true)
      expect(component.showAppNavBar).toBe(false)
    })

    it('shows navBar for /page/home', () => {
      component.routeSubs({ url: '/page/home' } as any)
      expect(component.showAppNavBar).toBe(true)
    })

    it('hides navBar for viewer URL', () => {
      component.routeSubs({ url: '/viewer/content' } as any)
      expect(component.showAppNavBar).toBe(false)
    })
  })

  describe('ngOnChanges', () => {
    it('sets showTitle when mode is bottom', () => {
      component.mode = 'bottom'
      component.ngOnChanges({ mode: { currentValue: 'bottom', previousValue: 'top', firstChange: false, isFirstChange: () => false } })
      expect((component.btnAppsConfig.widgetData as any).showTitle).toBe(true)
    })

    it('removes showTitle when mode is top', () => {
      component.mode = 'top'
      component.ngOnChanges({ mode: { currentValue: 'top', previousValue: 'bottom', firstChange: false, isFirstChange: () => false } })
      expect((component.btnAppsConfig.widgetData as any).showTitle).toBeUndefined()
    })
  })

  describe('cancelTour', () => {
    it('calls tourService.cancelPopupTour when popupTour exists', () => {
      component.popupTour = {};
      (component as any).tourService.cancelPopupTour = jest.fn()
      component.cancelTour()
      expect((component as any).tourService.cancelPopupTour).toHaveBeenCalled()
    })

    it('does not throw when popupTour is null', () => {
      component.popupTour = null
      expect(() => component.cancelTour()).not.toThrow()
    })
  })

  describe('bindUrl', () => {
    it('sets currentRoute when path is not /app/competencies', () => {
      component.bindUrl('/page/home')
      expect(component.currentRoute).toBe('/page/home')
    })

    it('does not change currentRoute for /app/competencies', () => {
      component.currentRoute = '/page/home'
      component.bindUrl('/app/competencies')
      expect(component.currentRoute).toBe('/page/home')
    })

    it('does not change currentRoute for empty path', () => {
      component.currentRoute = '/page/home'
      component.bindUrl('')
      expect(component.currentRoute).toBe('/page/home')
    })
  })

  describe('getters', () => {
    it('sShowAppNavBar returns showAppNavBar', () => {
      component.showAppNavBar = true
      expect(component.sShowAppNavBar).toBe(true)
    })

    it('needToHide returns true for assessment path', () => {
      component.currentRoute = 'all/assessment/test'
      expect(component.needToHide).toBe(true)
    })

    it('needToHide returns false for non-assessment path', () => {
      component.currentRoute = '/page/home'
      expect(component.needToHide).toBe(false)
    })

    it('isforPreview returns boolean', () => {
      expect(typeof component.isforPreview).toBe('boolean')
    })

    it('isenableLang returns boolean', () => {
      expect(typeof component.isenableLang).toBe('boolean')
    })

    it('isThisSetUpPage returns boolean', () => {
      expect(typeof component.isThisSetUpPage).toBe('boolean')
    })

    it('stillOnHomePage returns boolean', () => {
      expect(typeof component.stillOnHomePage).toBe('boolean')
    })

    it('fullMenuDispaly returns boolean', () => {
      expect(typeof component.fullMenuDispaly).toBe('boolean')
    })
  })

  describe('translateLabels', () => {
    it('calls translateLabelWithoutspace', () => {
      component.translateLabels('Hello', 'label')
      expect((component as any).langtranslations.translateLabelWithoutspace).toHaveBeenCalledWith('Hello', 'label', '')
    })
  })

  describe('redirectToPath', () => {
    it('navigates with key when pathConfig has key', () => {
      component.redirectToPath({ path: '/app/search', key: 'q' })
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/app/search'], { queryParams: { key: 'q' } })
    })

    it('navigates without key when no pathConfig.key', () => {
      component.redirectToPath({ path: '/page/home' })
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/page/home'])
    })
  })

  describe('openExploreMenu', () => {
    it('sets activeRoute to explore', () => {
      component.openExploreMenu()
      expect(component.activeRoute).toBe('explore')
      expect((component as any).configSvc.openExploreMenuForMWeb.next).toHaveBeenCalledWith(true)
    })
  })

  describe('getKarmaCount', () => {
    it('reads from localStorage if set', () => {
      const data = { userCourseEnrolmentInfo: { karmaPoints: 100 } }
      localStorage.setItem('userEnrollmentCount', JSON.stringify(data))
      component.getKarmaCount()
      expect(component.countdata).toBe(100)
      expect(component.karmaPointLoading).toBe(false)
    })

    it('handles missing localStorage gracefully', () => {
      localStorage.removeItem('userEnrollmentCount')
      expect(() => component.getKarmaCount()).not.toThrow()
    })
  })

  describe('viewKarmapoints', () => {
    it('returns false and does not navigate when disableMenu is true', () => {
      component.disableMenu = true
      const result = component.viewKarmapoints()
      expect(result).toBe(false)
      expect((component as any).router.navigate).not.toHaveBeenCalled()
    })

    it('navigates to karma-points when disableMenu is false', () => {
      component.disableMenu = false
      component.viewKarmapoints()
      expect((component as any).router.navigate).toHaveBeenCalledWith(['/app/person-profile/karma-points'])
    })
  })

  describe('handleNavigateBack', () => {
    it('navigates home for toc URL', () => {
      component['previousUrl'] = '/app/toc/do_123'
      component.handleNavigateBack()
      expect((component as any).router.navigateByUrl).toHaveBeenCalledWith('/page/home')
    })

    it('navigates home for pdf viewer URL', () => {
      component['previousUrl'] = '/viewer/pdf/do_123'
      component.handleNavigateBack()
      expect((component as any).router.navigateByUrl).toHaveBeenCalledWith('/page/home')
    })

    it('does not navigate for other URLs', () => {
      component['previousUrl'] = '/page/home'
      component.handleNavigateBack()
      expect((component as any).router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  describe('getItem', () => {
    it('returns item with forPreview and enableLang merged', () => {
      const result = component.getItem({ name: 'test' })
      expect(result.name).toBe('test')
      expect('forPreview' in result).toBe(true)
      expect('enableLang' in result).toBe(true)
    })
  })

  describe('getMyCount', () => {
    it('sets notificationsCount from API', () => {
      component.getMyCount()
      expect(component.notificationsCount).toBe(3)
    })

    it('handles API error', () => {
      (component as any).notificationsService.getNotificationsData = jest.fn(() => ({
        subscribe: (_s: any, e: any) => e(new Error('err'))
      }))
      component.getMyCount()
      expect(component.notificationsCount).toBe(0)
    })
  })

  describe('ngOnDestroy', () => {
    it('does not throw when subscription is undefined', () => {
      (component as any).myNotificationsSubscription = undefined
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('unsubscribes myNotificationsSubscription', () => {
      const unsub = jest.fn();
      (component as any).myNotificationsSubscription = { unsubscribe: unsub }
      component.ngOnDestroy()
      expect(unsub).toHaveBeenCalled()
    })
  })

  describe('constructor NavigationStart handler', () => {
    it('updates isHubEnable on NavigationStart', () => {
      const { NavigationStart } = require('@angular/router')
      mockRouterEvents.next(new NavigationStart(1, '/app/achievements'))
      expect(component.isHubEnable).toBe(false)
    })

    it('sets isHubEnable true for non-cert URL on NavigationStart', () => {
      const { NavigationStart } = require('@angular/router')
      mockRouterEvents.next(new NavigationStart(1, '/page/home'))
      expect(component.isHubEnable).toBe(true)
    })
  })

  describe('constructor NavigationEnd handler', () => {
    it('calls routeSubs on NavigationEnd', () => {
      jest.spyOn(component, 'routeSubs').mockImplementation(jest.fn())
      mockRouterEvents.next(new NavigationEnd(1, '/app/careers', '/app/careers'))
      expect(component.routeSubs).toHaveBeenCalled()
    })

    it('calls bindUrl on NavigationEnd', () => {
      jest.spyOn(component, 'bindUrl').mockImplementation(jest.fn())
      mockRouterEvents.next(new NavigationEnd(1, '/app/competencies/abc', '/app/competencies/abc'))
      expect(component.bindUrl).toHaveBeenCalledWith('abc')
    })
  })

  describe('constructor websiteLanguage', () => {
    it('calls translate.use when websiteLanguage in localStorage', () => {
      localStorage.setItem('websiteLanguage', 'hi')
      const mockTranslate = { setDefaultLang: jest.fn(), use: jest.fn() }
      const domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn(url => url) }
      const c = new (require('./app-nav-bar.component').AppNavBarComponent)(
        domSanitizer,
        (component as any).configSvc,
        (component as any).tourService,
        { events: mockRouterEvents.asObservable(), navigate: jest.fn() },
        mockTranslate,
        (component as any).events,
        (component as any).langtranslations,
        (component as any).urlService,
        (component as any).userSvc,
        (component as any).notificationsService,
        (component as any).libNotificationsService,
        (component as any).domainConfSvc,
      )
      expect(mockTranslate.use).toHaveBeenCalledWith('hi')
      c.ngOnDestroy?.()
    })
  })

  describe('ngOnInit NavigationEnd seeAll', () => {
    it('sets activeRoute to my learnings for seeAll URL', () => {
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/app/seeAll?key=continueLearning', '/app/seeAll?key=continueLearning'))
      expect(component.activeRoute).toBe('my learnings')
    })

    it('sets activeRoute from localStorage for NavigationEnd', () => {
      localStorage.setItem('activeRoute', 'Home')
      component.ngOnInit()
      mockRouterEvents.next(new NavigationEnd(1, '/unknown-path', '/unknown-path'))
      expect(component.activeRoute).toBe('home')
      localStorage.removeItem('activeRoute')
    })
  })
})
