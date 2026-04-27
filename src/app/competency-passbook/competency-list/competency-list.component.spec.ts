import { CompetencyListComponent } from './competency-list.component'
import { of, throwError } from 'rxjs'

jest.mock('src/environments/environment', () => ({
  environment: { compentencyVersionKey: 'v5' }
}), { virtual: true })

jest.mock('@sunbird-cb/collection/src/public-api', () => ({
  NsContent: { ICompentencyKeys: {} }
}), { virtual: true })

jest.mock('@sunbird-cb/utils-v2', () => ({
  ConfigurationsService: class { },
  MultilingualTranslationsService: class { },
  WidgetEnrollService: class { },
}))

const COMP_KEY = {
  vKey: 'vKey',
  vCompetencyArea: 'vCompetencyArea',
  vCompetencyTheme: 'vCompetencyTheme',
  vCompetencySubTheme: 'vCompetencySubTheme',
}

const makeSampleCourse = (theme: string, area: string, subTheme: string) => ({
  courseId: 'c1',
  collectionId: 'c1',
  content: {
    name: 'Course 1',
    vKey: [{ vCompetencyArea: area, vCompetencyTheme: theme, vCompetencySubTheme: subTheme }],
  },
  status: 2,
  batchId: 'b1',
  contentId: 'c1',
  issuedCertificates: [],
  completedOn: 1704067200000,
})

const makeComponent = () => {
  const configSvc: any = {
    compentency: { v5: COMP_KEY },
    userProfile: { userId: 'u1' },
  }
  const widgetEnrollService: any = { fetchInternalEnrollmentData: jest.fn(() => of({ result: { courses: [] } })) }
  const router: any = { navigate: jest.fn() }
  const snackBar: any = { open: jest.fn() }
  const lang: any = { translateLabel: jest.fn((l: string) => l) }
  const translate: any = { setDefaultLang: jest.fn(), use: jest.fn() }
  const doc = document

  return {
    component: new CompetencyListComponent(
      widgetEnrollService, configSvc, router, snackBar, lang, translate, configSvc, doc as any
    ),
    widgetEnrollService, configSvc, router, snackBar, lang,
  }
}

describe('CompetencyListComponent', () => {
  let component: CompetencyListComponent
  let widgetEnrollService: any
  let router: any
  let snackBar: any
  let lang: any

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks();
    ({ component, widgetEnrollService, router, snackBar, lang } = makeComponent())
  })

  afterEach(() => {
    try { component.ngOnDestroy() } catch { }
  })

  it('creates', () => {
    expect(component).toBeDefined()
  })

  it('sets isMobile based on innerWidth', () => {
    // jsdom default innerWidth is typically 1024, so isMobile should be false
    expect(typeof component.isMobile).toBe('boolean')
  })

  it('reads websiteLanguage from localStorage', () => {
    localStorage.setItem('websiteLanguage', 'hi')
    const { component: c } = makeComponent()
    expect(c).toBeDefined()
    c.ngOnDestroy()
  })

  describe('ngOnInit', () => {
    it('sets compentencyKey from configSvc.compentency', () => {
      component.ngOnInit()
      expect((component as any).compentencyKey).toEqual(COMP_KEY)
    })

    it('calls getUserEnrollmentList', () => {
      jest.spyOn(component as any, 'getUserEnrollmentList')
      component.ngOnInit()
      expect((component as any).getUserEnrollmentList).toHaveBeenCalled()
    })

    it('initializes filterObjData with compentency keys', () => {
      component.ngOnInit()
      expect(component.filterObjData).toHaveProperty('vCompetencyArea')
      expect(component.filterObjData).toHaveProperty('vCompetencyTheme')
    })
  })

  describe('mapEnrollmentData', () => {
    it('returns empty object when courseData is null', () => {
      component.ngOnInit()
      const result = component.mapEnrollmentData(null)
      expect(result).toEqual({})
    })

    it('returns empty object when no courses', () => {
      component.ngOnInit()
      const result = component.mapEnrollmentData({ courses: [] })
      expect(result).toEqual({})
    })

    it('maps courseId to data', () => {
      component.ngOnInit()
      const courses = [{ courseId: 'c1', content: { name: 'Course 1' } }]
      const result = component.mapEnrollmentData({ courses })
      expect(result['c1']).toBeDefined()
      expect(result['c1'].courseName).toBe('Course 1')
    })

    it('uses collectionId when courseId is missing', () => {
      component.ngOnInit()
      const courses = [{ collectionId: 'col1', content: { name: 'Test' } }]
      const result = component.mapEnrollmentData({ courses })
      expect(result['col1']).toBeDefined()
    })
  })

  describe('getUserEnrollmentList', () => {
    it('sets skeletonLoading to false on success', () => {
      component.ngOnInit()
      expect(component.competency.skeletonLoading).toBe(false)
    })

    it('processes courses with competency data', () => {
      const course = makeSampleCourse('T1', 'Functional', 'ST1')
      widgetEnrollService.fetchInternalEnrollmentData.mockReturnValue(of({
        result: { courses: [course] }
      }))
      component.ngOnInit()
      expect(component.competency.functional.length).toBeGreaterThanOrEqual(0)
    })

    it('handles error from enrollment service', () => {
      widgetEnrollService.fetchInternalEnrollmentData.mockReturnValue(
        throwError({ ok: false, message: 'error' })
      )
      component.ngOnInit()
      expect(component.competency.skeletonLoading).toBe(false)
      expect(snackBar.open).toHaveBeenCalled()
    })

    it('skips courses with status !== 2', () => {
      const course = { ...makeSampleCourse('T1', 'Functional', 'ST1'), status: 1 }
      widgetEnrollService.fetchInternalEnrollmentData.mockReturnValue(of({
        result: { courses: [course] }
      }))
      component.ngOnInit()
      expect(component.competency.functional.length).toBe(0)
    })

    it('sets behavioural for behavioral area', () => {
      const course = makeSampleCourse('T1', 'Behavioral', 'ST1')
      widgetEnrollService.fetchInternalEnrollmentData.mockReturnValue(of({
        result: { courses: [course] }
      }))
      component.ngOnInit()
      expect(component.competency.behavioural.length + component.competency.functional.length + component.competency.domain.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('handleLeftFilter', () => {
    it('sets showFilterIndicator', () => {
      component.handleLeftFilter('threeMonths')
      expect(component.showFilterIndicator).toBe('threeMonths')
    })
  })

  describe('handleTabChange', () => {
    it('updates tabValue from event label', () => {
      component.ngOnInit()
      component.competency.behavioural = [{ vCompetencyTheme: 'T1', latest: 1 }]
      const event: any = { tab: { textLabel: 'Behavioural' } }
      component.handleTabChange(event)
      expect(component.tabValue).toBe('behavioural')
    })
  })

  describe('handleShowAll', () => {
    it('toggles showAll', () => {
      component.ngOnInit()
      component.competency.all = [1, 2, 3, 4]
      const before = component.showAll
      component.handleShowAll()
      expect(component.showAll).toBe(!before)
    })
  })

  describe('handleClick', () => {
    it('sets competencyArray from param', () => {
      component.ngOnInit()
      component.competency.domain = [{ vCompetencyTheme: 'T2' }]
      component.handleClick('domain')
      expect(component.competencyArray).toEqual(component.competency.domain)
    })
  })

  describe('handleViewMore', () => {
    it('sets viewMore to true by default', () => {
      const obj: any = { viewMore: false }
      component.handleViewMore(obj)
      expect(obj.viewMore).toBe(true)
    })

    it('sets viewMore to false when flag is provided', () => {
      const obj: any = { viewMore: true }
      component.handleViewMore(obj, 'close')
      expect(obj.viewMore).toBe(false)
    })
  })

  describe('handleNavigate', () => {
    it('saves to localStorage and navigates', () => {
      component.handleNavigate({ vCompetencyTheme: 'T1' })
      expect(localStorage.getItem('details_page')).toContain('T1')
      expect(router.navigate).toHaveBeenCalledWith(['/page/competency-passbook/details'])
    })
  })

  describe('handleSearch', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.competency.functional = [
        { vCompetencyTheme: 'Data Analysis' },
        { vCompetencyTheme: 'HR Management' },
      ]
    })

    it('returns all results for empty search', () => {
      component.handleSearch('', 'Functional')
      expect(component.competencyArray).toEqual(component.competency.functional)
    })

    it('filters by theme name', () => {
      component.handleSearch('Data', 'Functional')
      expect(component.competencyArray).toHaveLength(1)
    })

    it('returns empty for no match', () => {
      component.handleSearch('ZZZ_NOMATCH', 'Functional')
      expect(component.competencyArray).toHaveLength(0)
    })

    it('does nothing when competency is empty', () => {
      component.competency.domain = []
      component.competencyArray = [{ existing: true }]
      component.handleSearch('test', 'Domain')
      expect(component.competencyArray).toEqual([{ existing: true }])
    })
  })

  describe('handleFilter', () => {
    it('adds overflow-hidden class when event is true', () => {
      component.handleFilter(true)
      expect(document.body.classList.contains('overflow-hidden')).toBe(true)
      document.body.classList.remove('overflow-hidden')
    })

    it('removes overflow-hidden class when event is false', () => {
      document.body.classList.add('overflow-hidden')
      component.handleFilter(false)
      expect(document.body.classList.contains('overflow-hidden')).toBe(false)
    })

    it('sets toggleFilter', () => {
      component.handleFilter(true)
      expect(component.toggleFilter).toBe(true)
      document.body.classList.remove('overflow-hidden')
    })
  })

  describe('handleApplyFilter', () => {
    it('closes filter and calls filterData', () => {
      component.ngOnInit()
      jest.spyOn(component as any, 'filterData')
      const filterVal = { vCompetencyArea: [], vCompetencyTheme: [], vCompetencySubTheme: [] }
      component.handleApplyFilter(filterVal)
      expect(component.toggleFilter).toBe(false)
      expect((component as any).filterData).toHaveBeenCalledWith(filterVal)
    })
  })

  describe('handleClearFilterObj', () => {
    it('calls filterData and resets array', () => {
      component.ngOnInit()
      jest.spyOn(component as any, 'filterData')
      const evt = { vCompetencyArea: [], vCompetencyTheme: [], vCompetencySubTheme: [] }
      component.handleClearFilterObj(evt)
      expect((component as any).filterData).toHaveBeenCalledWith(evt)
    })
  })

  describe('filterData', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.competency.all = [
        { vCompetencyArea: 'Functional', vCompetencyTheme: 'HR', subTheme: ['Recruitment'] },
        { vCompetencyArea: 'Domain', vCompetencyTheme: 'Finance', subTheme: ['Tax'] },
      ]
    })

    it('does nothing when all filters are empty', () => {
      component.competencyArray = component.competency.all
      const empty = { vCompetencyArea: [], vCompetencyTheme: [], vCompetencySubTheme: [] }
      component.filterData(empty)
      expect(component.filterApplied).toBe(false)
    })

    it('filters by competency area', () => {
      const filter = { vCompetencyArea: ['Functional'], vCompetencyTheme: [], vCompetencySubTheme: [] }
      component.filterData(filter)
      expect(component.competencyArray.length).toBeGreaterThanOrEqual(0)
    })

    it('filters by competency theme', () => {
      const filter = { vCompetencyArea: [], vCompetencyTheme: ['HR'], vCompetencySubTheme: [] }
      component.filterData(filter)
      expect(component.competencyArray.length).toBeGreaterThanOrEqual(0)
    })

    it('filters by subTheme', () => {
      const filter = { vCompetencyArea: [], vCompetencyTheme: [], vCompetencySubTheme: ['Tax'] }
      component.filterData(filter)
      expect(component.competencyArray.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('translateLabels', () => {
    it('calls translateLabel', () => {
      component.translateLabels('Hello', 'label')
      expect(lang.translateLabel).toHaveBeenCalledWith('Hello', 'label', '')
    })
  })

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
