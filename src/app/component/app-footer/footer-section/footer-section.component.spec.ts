import { FooterSectionComponent } from './footer-section.component'
import { SimpleChange } from '@angular/core'

jest.mock('lodash', () => ({
  __esModule: true,
  default: {
    get: (obj: any, path: string, def: any = undefined) => {
      const keys = path.split('.')
      let cur = obj
      for (const k of keys) { if (cur == null) return def; cur = cur[k] }
      return cur !== undefined ? cur : def
    },
    first: (arr: any[]) => arr && arr[0],
    filter: (arr: any[], pred: any) => {
      if (!arr) return []
      if (typeof pred === 'function') return arr.filter(pred)
      // object matcher
      return arr.filter((item: any) => Object.keys(pred).every(k => item[k] === pred[k]))
    },
    sortBy: (arr: any[], key: string) => arr ? [...arr].sort((a, b) => a[key] < b[key] ? -1 : 1) : [],
  }
}))

describe('FooterSectionComponent', () => {
  let component: FooterSectionComponent
  let mockConfigSvc: any
  let mockDiscussSvc: any
  let mockRouter: any
  let mockLang: any
  let mockDomainConfSvc: any

  beforeEach(() => {
    mockConfigSvc = {
      nodebbUserProfile: { username: 'testuser' },
      userRoles: new Set(['mdo_admin']),
    }
    mockDiscussSvc = { setDiscussionConfig: jest.fn() }
    mockRouter = { navigate: jest.fn() }
    mockLang = {
      translateLabel: jest.fn((l: string) => l),
      translateLabelWithoutspace: jest.fn((l: string) => l),
    }
    mockDomainConfSvc = { isKbPortal: jest.fn(() => true) }

    component = new FooterSectionComponent(mockConfigSvc, mockDiscussSvc, mockRouter, mockLang, mockDomainConfSvc)
  })

  it('creates', () => {
    expect(component).toBeDefined()
    expect(component.isKbPortal).toBe(true)
  })

  it('footerSectionConfig has 4 items by default', () => {
    expect(component.footerSectionConfig).toHaveLength(4)
  })

  describe('ngOnInit', () => {
    it('calls updateFooterConfig', () => {
      jest.spyOn(component as any, 'updateFooterConfig')
      component.ngOnInit()
      expect((component as any).updateFooterConfig).toHaveBeenCalled()
    })
  })

  describe('ngOnChanges', () => {
    it('calls updateFooterConfig when headerFooterConfigData changes', () => {
      jest.spyOn(component as any, 'updateFooterConfig')
      component.ngOnChanges({ headerFooterConfigData: new SimpleChange(null, { footerSectionConfig: [] }, false) })
      expect((component as any).updateFooterConfig).toHaveBeenCalled()
    })

    it('does not call updateFooterConfig for other input changes', () => {
      jest.spyOn(component as any, 'updateFooterConfig')
      component.ngOnChanges({ environment: new SimpleChange(null, {}, false) })
      expect((component as any).updateFooterConfig).not.toHaveBeenCalled()
    })
  })

  describe('updateFooterConfig', () => {
    it('updates footerSectionConfig from headerFooterConfigData', () => {
      component.headerFooterConfigData = {
        footerSectionConfig: [{ id: 99, order: 1, sectionHeading: 'Test', active: true, slug: 't' }]
      }
      component.ngOnInit()
      expect(component.footerSectionConfig[0].id).toBe(99)
    })

    it('sorts footerSectionConfig by order', () => {
      component.headerFooterConfigData = {
        footerSectionConfig: [
          { id: 2, order: 2, sectionHeading: 'B', active: true, slug: 'b' },
          { id: 1, order: 1, sectionHeading: 'A', active: true, slug: 'a' },
        ]
      }
      component.ngOnInit()
      expect(component.footerSectionConfig[0].order).toBe(1)
    })

    it('filters portals without public/allowed roles', () => {
      component.headerFooterConfigData = null
      component.environment = {
        portals: [
          { id: 'p1', name: 'Portal1', isPublic: true, roles: [] },
          { id: 'p2', name: 'Frac Dictionary', isPublic: false, roles: [] },
        ]
      }
      component.ngOnInit()
      expect(component.environment.portals.some((p: any) => p.name === 'Frac Dictionary')).toBe(false)
    })

    it('removes Related Links section when no portals', () => {
      component.headerFooterConfigData = null
      component.environment = {
        portals: [{ id: 'p1', name: 'Frac Dictionary', isPublic: false, roles: [] }]
      }
      component.ngOnInit()
      const hasRelatedLinks = component.footerSectionConfig.some((s: any) => s.sectionHeading === 'Related Links')
      expect(hasRelatedLinks).toBe(false)
    })
  })

  describe('navigate', () => {
    it('sets discuss config and navigates', () => {
      component.navigate()
      expect(mockDiscussSvc.setDiscussionConfig).toHaveBeenCalled()
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/discussion-forum'], expect.any(Object))
    })
  })

  describe('isAllowed', () => {
    it('returns true when no roles defined', () => {
      component.environment = { portals: [{ id: 'p1', roles: [] }] }
      expect(component.isAllowed('p1')).toBe(true)
    })

    it('returns true when user has required role', () => {
      component.environment = { portals: [{ id: 'p1', roles: ['mdo_admin'] }] }
      expect(component.isAllowed('p1')).toBe(true)
    })

    it('returns false when user lacks required role', () => {
      component.environment = { portals: [{ id: 'p1', roles: ['some_other_role'] }] }
      expect(component.isAllowed('p1')).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('returns true for matching role (lowercase)', () => {
      expect(component.hasRole(['mdo_admin'])).toBe(true)
    })

    it('returns false for non-matching role', () => {
      expect(component.hasRole(['unknown_role'])).toBe(false)
    })
  })

  describe('onClick', () => {
    it('toggles open class on parentElement', () => {
      const el = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(el)
      component.onClick({ target: el })
      expect(parent.classList.contains('open')).toBe(true)
      component.onClick({ target: el })
      expect(parent.classList.contains('open')).toBe(false)
    })
  })

  describe('translateLabels', () => {
    it('calls translateLabelWithoutspace', () => {
      component.translateLabels('Hub', 'hub')
      expect(mockLang.translateLabelWithoutspace).toHaveBeenCalledWith('Hub', 'hub', '')
    })
  })

  describe('translateLabelsWithSpace', () => {
    it('calls translateLabel', () => {
      component.translateLabelsWithSpace('About', 'about')
      expect(mockLang.translateLabel).toHaveBeenCalledWith('About', 'about', '')
    })
  })
})
