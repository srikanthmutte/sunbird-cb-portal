import { InitService } from './init.service'
import { of } from 'rxjs'

jest.mock('../../environments/environment', () => ({ environment: { production: false } }))
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))
jest.mock('moment', () => { const m = jest.requireActual('moment'); return m })

jest.mock('@sunbird-cb/resolver', () => ({
  hasPermissions: jest.fn(),
  hasUnitPermission: jest.fn(),
  NsWidgetResolver: {},
  WidgetResolverService: class { initialize = jest.fn() },
}), { virtual: true })

jest.mock('@sunbird-cb/resolver-v2', () => ({
  SbUiResolverService: class { initialize = jest.fn() },
}), { virtual: true })

jest.mock('@sunbird-cb/utils-v2', () => ({
  ConfigurationsService: class { },
  LoggerService: class { info = jest.fn(); warn = jest.fn(); removeConsoleAccess = jest.fn() },
  NsAppsConfig: {},
  NsInstanceConfig: {},
  UserPreferenceService: class { initialize = jest.fn(); fetchUserPreference = jest.fn(() => Promise.resolve({})) },
  WidgetEnrollService: class { fetchEnrollStats = jest.fn(() => of({ result: {} })) },
}), { virtual: true })

jest.mock('@sunbird-cb/collection/src/public-api', () => ({
  BtnSettingsService: class { initializePrefChanges = jest.fn() },
}), { virtual: true })

jest.mock('@sunbird-cb/collection', () => ({
  BtnSettingsService: class { initializePrefChanges = jest.fn() },
  BtnPageBackService: class { },
  WidgetContentService: class { },
}), { virtual: true })

// The actual library path used by init.service.ts
jest.mock('../../../library/ws-widget/collection/src/public-api', () => ({
  BtnSettingsService: class { initializePrefChanges = jest.fn() },
}), { virtual: true })

jest.mock('@sunbird-cb/collection/src/lib/grid-layout/nps-grid.service', () => ({
  NPSGridService: class { },
}), { virtual: true })

jest.mock('@ng-translate/core', () => ({
  TranslateService: class { use = jest.fn(); setDefaultLang = jest.fn() },
}), { virtual: true })

jest.mock('@ngx-translate/core', () => ({
  TranslateService: class { use = jest.fn(); setDefaultLang = jest.fn() },
}), { virtual: true })

jest.mock('src/app/services/netcore.service', () => ({
  NetCoreService: class {
    netCoreConfigReadData = jest.fn(() => of({}))
    getOrgReadData = jest.fn(() => of({}))
  },
}), { virtual: true })

jest.mock('src/app/services/global.service', () => ({
  GlobalService: class { globalConfigReadData = jest.fn(() => of({})) },
}), { virtual: true })

jest.mock('src/app/services/common-data.service', () => ({
  CommonDataService: class { },
}), { virtual: true })

jest.mock('@ws/app/src/lib/routes/profile-v3/models/profile-v3.models', () => ({}), { virtual: true })

  // Mock declare for smartech global
  ; (global as any).smartech = jest.fn()

const buildMocks = () => {
  const logger = { info: jest.fn(), warn: jest.fn(), removeConsoleAccess: jest.fn() }
  const configSvc = {
    baseUrl: '/assets',
    isProduction: false,
    instanceConfig: null as any,
    rootOrg: '',
    org: [],
    activeOrg: '',
    appSetup: false,
    positions: [],
    compentency: [],
    globalConfig: null,
    netcoreConfig: null,
    overrideThemeChanges: null,
    profileTimelyNudges: null,
    iGOTAIConfig: null,
    userProfile: { userId: 'u1', rootOrgId: 'org1' },
    unMappedUser: { id: 'u1', rootOrgId: 'org1' },
    restrictedWidgets: new Set<string>(),
    userRoles: new Set<string>(),
    userGroups: new Set<string>(),
    restrictedFeatures: new Set<string>(),
    appsConfig: null,
    orgReadData: {},
    updateProfileObservable: of(false),
  }
  const widgetResolverService = { initialize: jest.fn() }
  const sbUiResolverService = { initialize: jest.fn() }
  const settingsSvc = { initializePrefChanges: jest.fn() }
  const userPreference = { initialize: jest.fn(), fetchUserPreference: jest.fn(() => Promise.resolve({})) }
  const http = {
    get: jest.fn(() => of({})),
    post: jest.fn(() => of({})),
  }
  const npsSvc = {}
  const translate = {
    use: jest.fn(),
    setDefaultLang: jest.fn(),
  }
  const enrollSvc = {
    fetchEnrollStats: jest.fn(() => of({ result: {} })),
  }
  const netCoreService = {
    netCoreConfigReadData: jest.fn(() => of({ netcoreConfig: {} })),
    getOrgReadData: jest.fn(() => of({})),
  }
  const globalService = {
    globalConfigReadData: jest.fn(() => of({ globalConfig: {} })),
  }
  const commonDataSvc = {}
  const matIconRegistry = { addSvgIcon: jest.fn() }
  const domSanitizer = { bypassSecurityTrustResourceUrl: (u: string) => u }
  const baseHref = '/'

  return {
    logger, configSvc, widgetResolverService, sbUiResolverService,
    settingsSvc, userPreference, http, npsSvc, translate, enrollSvc,
    netCoreService, globalService, commonDataSvc, matIconRegistry, domSanitizer, baseHref,
  }
}

const makeService = (m: any) =>
  new (InitService as any)(
    m.logger,
    m.configSvc,
    m.widgetResolverService,
    m.sbUiResolverService,
    m.settingsSvc,
    m.userPreference,
    m.http,
    m.npsSvc,
    m.translate,
    m.enrollSvc,
    m.netCoreService,
    m.globalService,
    m.commonDataSvc,
    m.baseHref,
    m.domSanitizer,
    m.matIconRegistry,
  )

describe('InitService', () => {
  let service: InitService
  let mocks: any

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mocks = buildMocks()
    service = makeService(mocks)
  })

  // ── Construction ──────────────────────────────────────────────────────────
  describe('construction', () => {
    it('creates an instance', () => {
      expect(service).toBeDefined()
    })

    it('sets configSvc.isProduction from environment', () => {
      expect(mocks.configSvc.isProduction).toBe(false)
    })

    it('registers svg icons', () => {
      expect(mocks.matIconRegistry.addSvgIcon).toHaveBeenCalledWith(
        'pin',
        expect.anything()
      )
    })

    it('registers facebook icon', () => {
      expect(mocks.matIconRegistry.addSvgIcon).toHaveBeenCalledWith(
        'facebook',
        expect.anything()
      )
    })

    it('registers linked-in icon', () => {
      expect(mocks.matIconRegistry.addSvgIcon).toHaveBeenCalledWith(
        'linked-in',
        expect.anything()
      )
    })

    it('registers category_xs icon', () => {
      expect(mocks.matIconRegistry.addSvgIcon).toHaveBeenCalledWith(
        'category_xs',
        expect.anything()
      )
    })
  })

  // ── locale getter ─────────────────────────────────────────────────────────
  describe('locale getter', () => {
    it('returns en for baseHref "/"', () => {
      expect((service as any).locale).toBe('en')
    })

    it('returns locale from baseHref "/hi/"', () => {
      ; (service as any).baseHref = '/hi/'
      expect((service as any).locale).toBe('hi')
    })
  })

  // ── isAnonymousTelemetry ──────────────────────────────────────────────────
  describe('isAnonymousTelemetry', () => {
    it('is computed at construction time based on window.location.href', () => {
      // Just ensure the property exists
      expect(typeof (service as any).isAnonymousTelemetry).toBe('boolean')
    })
  })

  // ── isAnonymousTelemetryRequired getter ───────────────────────────────────
  describe('isAnonymousTelemetryRequired', () => {
    it('returns true when URL contains /public/', () => {
      const origHref = window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/public/home' },
        writable: true,
      })
      expect(service.isAnonymousTelemetryRequired).toBe(true)
      Object.defineProperty(window, 'location', {
        value: { href: origHref },
        writable: true,
      })
    })
  })

  // ── fetchDefaultConfig ────────────────────────────────────────────────────
  describe('fetchDefaultConfig (private)', () => {
    it('calls http.get with host.config.json URL', async () => {
      mocks.http.get.mockReturnValue(
        of({ rootOrg: 'ro', org: ['o1'], appSetup: true, positions: [], compentency: [] })
      )
      await (service as any).fetchDefaultConfig()
      expect(mocks.http.get).toHaveBeenCalledWith(
        expect.stringContaining('host.config.json')
      )
    })

    it('sets configSvc.instanceConfig from response', async () => {
      const cfg = { rootOrg: 'ro', org: ['o1'], appSetup: false, positions: [], compentency: [] }
      mocks.http.get.mockReturnValue(of(cfg))
      await (service as any).fetchDefaultConfig()
      expect(mocks.configSvc.instanceConfig).toEqual(cfg)
    })
  })

  // ── globalConfigData ──────────────────────────────────────────────────────
  describe('globalConfigData (private)', () => {
    it('calls globalService.globalConfigReadData', async () => {
      await (service as any).globalConfigData()
      expect(mocks.globalService.globalConfigReadData).toHaveBeenCalled()
    })

    it('sets configSvc.globalConfig', async () => {
      mocks.globalService.globalConfigReadData.mockReturnValue(of({ globalConfig: { key: 'val' } }))
      await (service as any).globalConfigData()
      expect(mocks.configSvc.globalConfig).toEqual({ key: 'val' })
    })
  })

  // ── netCoreConfig ─────────────────────────────────────────────────────────
  describe('netCoreConfig (private)', () => {
    it('calls netCoreService.netCoreConfigReadData', async () => {
      await (service as any).netCoreConfig()
      expect(mocks.netCoreService.netCoreConfigReadData).toHaveBeenCalled()
    })

    it('sets configSvc.netcoreConfig', async () => {
      mocks.netCoreService.netCoreConfigReadData.mockReturnValue(of({ netcoreConfig: { isActive: true } }))
      await (service as any).netCoreConfig()
      expect(mocks.configSvc.netcoreConfig).toEqual({ isActive: true })
    })
  })

  // ── setTelemetrySessionId ─────────────────────────────────────────────────
  describe('setTelemetrySessionId (private)', () => {
    it('stores telemetrySessionId in localStorage', () => {
      ; (service as any).setTelemetrySessionId()
      expect(localStorage.getItem('telemetrySessionId')).toBe('mock-uuid')
    })

    it('removes existing telemetrySessionId before setting new one', () => {
      localStorage.setItem('telemetrySessionId', 'old-id')
        ; (service as any).setTelemetrySessionId()
      expect(localStorage.getItem('telemetrySessionId')).toBe('mock-uuid')
    })
  })
})

