import { IGotSarthiComponent } from './igot-sarthi.component'
import { NavigationEnd } from '@angular/router'
import { of, throwError } from 'rxjs'

jest.mock('../../../environments/environment', () => ({
  environment: { supportEmail: 'test@gov.in' }
}))
jest.mock('@sunbird-cb/collection/src/lib/_common/non-relevent-feedback-dialog/non-relevent-feedback-dialog.component', () => ({
  NonReleventFeedbackDialogComponent: class { }
}), { virtual: true })
jest.mock('lodash/cloneDeep', () => {
  const fn = (v: any) => JSON.parse(JSON.stringify(v));
  (fn as any).__esModule = true
  return { __esModule: true, default: fn }
})

const makeFaqLocalStorageData = () => JSON.stringify({
  en: {
    information: {
      quesMap: [{ quesId: '1', quesValue: 'Q1', ansVal: 'A1' }],
      recommendationMap: [
        { catId: 'cat1', categoryType: 'Logged-In', priority: 1, recommendedQues: [{ priority: 1, quesID: '1' }] },
        { catId: 'cat3', categoryType: 'Both', priority: 3, recommendedQues: [{ priority: 1, quesID: '3' }] }
      ],
      categoryMap: [
        { catId: 'cat1', catName: 'Cat1' },
        { catId: 'cat2', catName: 'Cat2' },
        { catId: 'cat3', catName: 'Cat3' }
      ]
    },
    issue: {
      quesMap: [{ quesId: '2', quesValue: 'Issue1', ansVal: 'IA1' }],
      recommendationMap: [],
      categoryMap: []
    }
  }
})

describe('IGotSarthiComponent', () => {
  let component: IGotSarthiComponent
  let mockServices: any
  let scrollToSpy: jest.SpyInstance
  let windowOpenSpy: jest.SpyInstance

  const setupLocalStorage = (overrides: Record<string, string> = {}) => {
    localStorage.clear()
    const defaults: Record<string, string> = {
      'selectedLanguage': 'en',
      'faq': makeFaqLocalStorageData(),
      'faq-languages': JSON.stringify([{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }])
    }
    Object.entries({ ...defaults, ...overrides }).forEach(([k, v]) => localStorage.setItem(k, v))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setupLocalStorage()
    scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => { })
    windowOpenSpy = jest.spyOn(window, 'open').mockReturnValue(null as any);
    // execCommand is deprecated/missing in jsdom - stub it
    (document as any).execCommand = jest.fn()

    mockServices = {
      configSvc: {
        userProfile: {
          firstName: 'John',
          profileImageUrl: '',
          professionalDetails: [{ designation: 'Developer' }],
          departmentName: 'IT Dept'
        }
      },
      eventSvc: { dispatchChatbotEvent: jest.fn() },
      renderer: { addClass: jest.fn(), removeClass: jest.fn() },
      chatbotService: {
        getChatData: jest.fn(() => of({ payload: { config: { data: 'cfg' } } })),
        getLangugages: jest.fn(() => of({ status: { code: 200 }, payload: { languages: [{ value: 'en', label: 'English' }] } })),
        aiGlobalSearch: jest.fn(() => of({ answer: 'Test answer', RetrievedChunks: [], query_id: 'qid', query: 'q' })),
        aiGlobalSearchFromInternet: jest.fn(() => of({ answer: 'Internet answer', query_id: 'iid' })),
        saveAIChatPositiveContentRating: jest.fn(() => of({ status: 'success' })),
        shareAIFeedback: jest.fn(() => of({ status: 'success' })),
        iGOTAIChatHistory: []
      },
      dialog: {
        open: jest.fn(() => ({
          afterClosed: () => of('negative feedback'),
          close: jest.fn()
        }))
      },
      matSnackBarNew: { open: jest.fn() },
      router: { events: of(new NavigationEnd(1, '/test', '/test')) }
    }

    component = new IGotSarthiComponent(
      mockServices.configSvc,
      mockServices.eventSvc,
      mockServices.renderer,
      mockServices.chatbotService,
      mockServices.dialog,
      mockServices.matSnackBarNew,
      mockServices.router
    )

    component.textArea = {
      nativeElement: { style: { height: '30px' }, scrollHeight: 50, value: '' }
    } as any;
    (component as any).myScrollContainer = {
      nativeElement: { scrollTop: 0, scrollHeight: 100 }
    }
    component.scrollToBottomEvent = { emit: jest.fn() } as any
  })

  // ── Initialization ──────────────────────────────────────────────────────────
  describe('Initialization', () => {
    it('creates component with defaults', () => {
      expect(component).toBeDefined()
      expect(component.showIcon).toBe(true)
      expect(component.currentFilter).toBe('information')
      expect(component.selectedLaguage).toBe('en')
      expect(component.copiedIndex).toBe(-1)
      expect(component.containerHeight).toBe(36)
    })

    it('ngOnInit sets userIcon from profileImageUrl', () => {
      mockServices.configSvc.userProfile.profileImageUrl = 'http://img.png'
      component.ngOnInit()
      expect(component.userIcon).toBe('http://img.png')
    })

    it('ngOnInit creates initials when no profileImageUrl', () => {
      mockServices.configSvc.userProfile.profileImageUrl = ''
      component.ngOnInit()
      expect(component.initials).toBeDefined()
      expect(component.initials.length).toBeGreaterThanOrEqual(1)
    })

    it('ngOnInit detects /certs route → isHubEnable false', () => {
      mockServices.router.events = of(new NavigationEnd(1, '/certs', '/certs'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(false)
    })

    it('ngOnInit detects /public/certs route → isHubEnable false', () => {
      mockServices.router.events = of(new NavigationEnd(1, '/public/certs', '/public/certs'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(false)
    })

    it('ngOnInit detects dashboard route → isHubEnable true', () => {
      mockServices.router.events = of(new NavigationEnd(1, '/dashboard', '/dashboard'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(true)
    })

    it('ngOnInit filters empty messages from iGOTAIChatHistory', () => {
      mockServices.chatbotService.iGOTAIChatHistory = [
        { newMessage: 'valid' }, { newMessage: '' }, { newMessage: 'ok' }
      ]
      component.ngOnInit()
      expect(component.aiSearchResultArr.length).toBe(2)
    })

    it('ngAfterViewInit calls resizeTextarea', () => {
      jest.spyOn(component, 'resizeTextarea')
      component.ngAfterViewInit()
      expect(component.resizeTextarea).toHaveBeenCalledWith(component.textArea.nativeElement, '')
    })

    it('ngAfterViewChecked does not throw', () => {
      expect(() => component.ngAfterViewChecked()).not.toThrow()
    })

    it('ngOnDestroy does not throw', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  // ── Localization ────────────────────────────────────────────────────────────
  describe('Localization', () => {
    it('greetings returns Namaste for en', () => {
      component.selectedLaguage = 'en'
      expect(component.greetings()).toBe('Namaste')
    })

    it('greetings returns Hindi greeting for hi', () => {
      component.selectedLaguage = 'hi'
      expect(component.greetings()).toBe('नमस्ते')
    })

    it('getInfoText returns label for known key', () => {
      component.selectedLaguage = 'en'
      expect(component.getInfoText('information')).toBe('Information')
      expect(component.getInfoText('issue')).toBe('Issues')
    })

    it('getInfoText returns label as-is for unknown key', () => {
      component.selectedLaguage = 'en'
      expect(component.getInfoText('unknown')).toBe('unknown')
    })

    it('showMore returns correct text per language', () => {
      component.selectedLaguage = 'en'
      expect(component.showMore()).toBe('Show More')
      component.selectedLaguage = 'hi'
      expect(component.showMore()).toBe('और दिखाओ')
    })
  })

  // ── Data Management ─────────────────────────────────────────────────────────
  describe('Data Management', () => {
    it('getData calls chatbotService with correct params for information', () => {
      jest.spyOn(component, 'setDataToLocalStorage').mockImplementation(jest.fn())
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.getData()
      expect(mockServices.chatbotService.getChatData).toHaveBeenCalledWith({ lang: 'en', config_type: 'IN' })
      expect(component.displayLoader).toBe(false)
    })

    it('getData calls chatbotService with IS for issue', () => {
      jest.spyOn(component, 'setDataToLocalStorage').mockImplementation(jest.fn())
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.currentFilter = 'issue'
      component.selectedLaguage = 'hi'
      component.getData()
      expect(mockServices.chatbotService.getChatData).toHaveBeenCalledWith({ lang: 'hi', config_type: 'IS' })
    })

    it('getData does not set displayLoader false when no payload', () => {
      mockServices.chatbotService.getChatData.mockReturnValue(of({}))
      component.getData()
      expect(component.displayLoader).toBe(true)
    })

    it('setDataToLocalStorage writes to localStorage and toggles filter', () => {
      jest.spyOn(component, 'toggleFilter').mockImplementation(jest.fn())
      localStorage.setItem('faq', '{}')
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.setDataToLocalStorage({ q: 1 })
      expect(localStorage.getItem('faq')).toBeTruthy()
      expect(component.toggleFilter).toHaveBeenCalledWith('information')
    })

    it('setDataToLocalStorage toggles issue filter', () => {
      jest.spyOn(component, 'toggleFilter').mockImplementation(jest.fn())
      localStorage.setItem('faq', '{}')
      component.currentFilter = 'issue'
      component.setDataToLocalStorage({ q: 1 })
      expect(component.toggleFilter).toHaveBeenCalledWith('issue')
    })

    it('getQns populates questionsAndAns', () => {
      component.responseData = { quesMap: [{ quesId: 'q1', quesValue: 'Q?' }] }
      component.getQns()
      expect(component.questionsAndAns['q1']).toEqual({ quesId: 'q1', quesValue: 'Q?' })
    })

    it('initData calls pushData and getQns', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getPriorityQuestion').mockReturnValue([])
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      component.responseData = { quesMap: [], recommendationMap: [] }
      component.initData({})
      expect(component.pushData).toHaveBeenCalled()
      expect(component.getQns).toHaveBeenCalled()
    })

    it('selectLaguage updates language and resets chats', () => {
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.chatInformation = [{ x: 1 }]
      component.chatIssues = [{ y: 2 }]
      component.selectLaguage({ target: { value: 'hi' } })
      expect(component.selectedLaguage).toBe('hi')
      expect(localStorage.getItem('selectedLanguage')).toBe('hi')
      expect(component.chatInformation).toEqual([])
      expect(component.chatIssues).toEqual([])
      expect(component.checkForApiCalls).toHaveBeenCalled()
    })

    it('readFromLocalStorage sets responseData for information', () => {
      const stored = { en: { information: { type: 'info' }, issue: { type: 'issue' } } }
      localStorage.setItem('result', JSON.stringify(stored))
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.readFromLocalStorage()
      expect(component.responseData).toEqual({ type: 'info' })
    })

    it('readFromLocalStorage sets responseData for issue', () => {
      const stored = { en: { information: { type: 'info' }, issue: { type: 'issue' } } }
      localStorage.setItem('result', JSON.stringify(stored))
      component.currentFilter = 'issue'
      component.selectedLaguage = 'en'
      component.readFromLocalStorage()
      expect(component.responseData).toEqual({ type: 'issue' })
    })

    it('readFromLocalStorage handles null from localStorage', () => {
      localStorage.removeItem('result')
      component.readFromLocalStorage()
      expect(component.responseData).toBeUndefined()
    })
  })

  // ── UI Interactions ─────────────────────────────────────────────────────────
  describe('UI Interactions', () => {
    it('goToBottom calls window.scrollTo', () => {
      component.goToBottom()
      expect(scrollToSpy).toHaveBeenCalled()
    })

    it('iconClick start: sets showIcon false, calls raiseChatStartTelemetry', () => {
      jest.spyOn(component, 'raiseChatStartTelemetry')
      component.showIcon = true
      component.iconClick('start')
      expect(component.showIcon).toBe(false)
      expect(component.currentFilter).toBe('information')
      expect(component.expanded).toBe(false)
      expect(component.raiseChatStartTelemetry).toHaveBeenCalled()
    })

    it('iconClick end: toggles showIcon and resets state', () => {
      jest.spyOn(component, 'raiseChatEndTelemetry')
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.showIcon = false
      component.chatInformation = [{ x: 1 }]
      component.chatIssues = [{ y: 2 }]
      component.more = true
      component.iconClick('end')
      expect(component.showIcon).toBe(true)
      expect(component.chatInformation).toEqual([])
      expect(component.chatIssues).toEqual([])
      expect(component.selectedLaguage).toBe('en')
      expect(component.more).toBe(false)
      expect(component.raiseChatEndTelemetry).toHaveBeenCalled()
    })

    it('toggleFilter sets currentFilter and calls checkForApiCalls', () => {
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.toggleFilter('issue')
      expect(component.currentFilter).toBe('issue')
      expect(component.more).toBe(false)
      expect(component.checkForApiCalls).toHaveBeenCalled()
    })

    it('selectedQuestion pushes messages and raises telemetry', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'raiseTemeletyInterat')
      component.questionsAndAns = {
        q1: { quesValue: 'Test?', ansVal: 'Ans <teams_call_link> and <email_configuration>' }
      }
      component.currentFilter = 'information'
      const data: any = { selectedValue: '' }
      component.selectedQuestion({ quesID: 'q1', recommendedQues: [] }, data)
      expect(data.selectedValue).toBe('q1')
      expect(component.pushData).toHaveBeenCalledTimes(2)
      expect(component.raiseTemeletyInterat).toHaveBeenCalledWith('q1')
    })

    it('pushData appends to chatInformation for information filter', () => {
      component.currentFilter = 'information'
      component.chatInformation = []
      const msg = { type: 'test' }
      component.pushData(msg)
      expect(component.chatInformation).toContain(msg)
    })

    it('pushData appends to chatIssues for issue filter', () => {
      component.currentFilter = 'issue'
      component.chatIssues = []
      const msg = { type: 'test' }
      component.pushData(msg)
      expect(component.chatIssues).toContain(msg)
    })

    it('getuserjourney filters by tab', () => {
      (component as any).userJourney = [
        { tab: 'information' }, { tab: 'information' }, { tab: 'issue' }
      ]
      expect(component.getuserjourney('information')).toHaveLength(2)
      expect(component.getuserjourney('issue')).toHaveLength(1)
    })

    it('scrollToBottom sets scrollTop when container exists', () => {
      component.scrollToBottom()
      expect((component as any).myScrollContainer.nativeElement.scrollTop).toBe(100)
    })

    it('scrollToBottom does not throw when container is null', () => {
      (component as any).myScrollContainer = undefined
      expect(() => component.scrollToBottom()).not.toThrow()
    })

    it('clickOutside calls iconClick end', () => {
      jest.spyOn(component, 'iconClick')
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.clickOutside()
      expect(component.iconClick).toHaveBeenCalledWith('end')
    })

    it('disableScroll calls renderer.addClass', () => {
      (component as any).disableScroll()
      expect(mockServices.renderer.addClass).toHaveBeenCalledWith(document.body, 'disable-scroll')
    })

    it('enableScroll calls renderer.removeClass', () => {
      (component as any).enableScroll()
      expect(mockServices.renderer.removeClass).toHaveBeenCalledWith(document.body, 'disable-scroll')
    })
  })

  // ── Priority Questions & Categories ────────────────────────────────────────
  describe('Priority Questions and Categories', () => {
    beforeEach(() => {
      component.responseData = {
        recommendationMap: [
          { catId: 'cat1', categoryType: 'Logged-In', priority: 1, recommendedQues: [{ priority: 1, quesID: '1' }] },
          { catId: 'cat2', categoryType: 'Not Logged-In', priority: 2, recommendedQues: [{ priority: 1, quesID: '2' }] },
          { catId: 'cat3', categoryType: 'Both', priority: 3, recommendedQues: [{ priority: 1, quesID: '3' }, { priority: 2, quesID: '4' }] }
        ],
        categoryMap: [
          { catId: 'cat1', catName: 'Cat1' },
          { catId: 'cat2', catName: 'Cat2' },
          { catId: 'cat3', catName: 'Cat3' }
        ]
      }
    })

    it('getPriorityQuestion for logged-in user', () => {
      component.userInfo = { firstName: 'John' }
      const result = component.getPriorityQuestion(1)
      expect(result.length).toBeGreaterThan(0)
    })

    it('getPriorityQuestion for not-logged-in user', () => {
      component.userInfo = null
      const result = component.getPriorityQuestion(1)
      expect(result.length).toBeGreaterThan(0)
    })

    it('getPriorityQuestion with empty recommendationMap', () => {
      component.responseData = { recommendationMap: [] }
      expect(component.getPriorityQuestion(1)).toEqual([])
    })

    it('showMoreQuestion calls pushData', () => {
      jest.spyOn(component, 'getPriorityQuestion').mockReturnValue([{ quesID: '1' }])
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      component.showMoreQuestion()
      expect(component.pushData).toHaveBeenCalled()
    })

    it('showCategory for "all" calls sortCategory and pushData', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'sortCategory').mockReturnValue([{ catId: 'all' }])
      component.showCategory({ catId: 'all', catName: 'All' })
      expect(component.pushData).toHaveBeenCalledTimes(2)
    })

    it('showCategory for specific category calls raiseCategotyTelemetry', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'raiseCategotyTelemetry')
      component.showCategory({ catId: 'cat1', catName: 'Cat1' })
      expect(component.raiseCategotyTelemetry).toHaveBeenCalledWith('cat1')
    })

    it('getCategories populates categories for logged-in user', () => {
      component.userInfo = { firstName: 'John' }
      component.selectedLaguage = 'en'
      component.getCategories()
      expect(component.categories.length).toBeGreaterThan(0)
    })

    it('getCategories populates categories for not-logged-in user', () => {
      component.userInfo = null
      component.selectedLaguage = 'en'
      component.getCategories()
      expect(component.categories.length).toBeGreaterThan(0)
    })

    it('getCategories uses all+categories when >= 6 results', () => {
      const manyRecs = Array.from({ length: 7 }, (_, i) => ({
        catId: `cat${i}`, categoryType: 'Both', priority: i,
        recommendedQues: []
      }))
      const manyCats = Array.from({ length: 7 }, (_, i) => ({ catId: `cat${i}`, catName: `C${i}` }))
      component.responseData = { recommendationMap: manyRecs, categoryMap: manyCats }
      component.userInfo = {}
      component.selectedLaguage = 'en'
      component.getCategories()
      expect(component.categories.length).toBeGreaterThan(6)
    })

    it('sortCategory sorts by priority', () => {
      component.categories = [{ priority: 3 }, { priority: 1 }, { priority: 2 }] as any
      const sorted = component.sortCategory()
      expect(sorted[0].priority).toBe(1)
      expect(sorted[2].priority).toBe(3)
    })

    it('sortCategory handles equal priorities', () => {
      component.categories = [{ priority: 1 }, { priority: 1 }] as any
      const sorted = component.sortCategory()
      expect(sorted.length).toBe(2)
    })

    it('sortCategory handles empty array', () => {
      component.categories = [] as any
      expect(component.sortCategory()).toEqual([])
    })
  })

  // ── API Calls ────────────────────────────────────────────────────────────────
  describe('API Calls', () => {
    it('getLanguages calls getData on success', () => {
      jest.spyOn(component, 'getData').mockImplementation(jest.fn())
      component.getLanguages()
      expect(localStorage.getItem('faq-languages')).toBeTruthy()
      expect(component.getData).toHaveBeenCalled()
      expect(component.displayLoader).toBe(false)
    })

    it('getLanguages keeps displayLoader true on non-200', () => {
      mockServices.chatbotService.getLangugages.mockReturnValue(of({ status: { code: 400 } }))
      component.getLanguages()
      expect(component.displayLoader).toBe(true)
    })

    it('getLanguages handles empty response', () => {
      mockServices.chatbotService.getLangugages.mockReturnValue(of({}))
      component.getLanguages()
      expect(component.displayLoader).toBe(true)
    })

    it('checkForApiCalls with existing info data calls initData when chatInformation is empty', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.chatInformation = []
      component.checkForApiCalls()
      expect(component.initData).toHaveBeenCalled()
    })

    it('checkForApiCalls reuses existing chatInformation when not empty', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.chatInformation = [{ x: 1 }]
      component.checkForApiCalls()
      expect(component.initData).not.toHaveBeenCalled()
    })

    it('checkForApiCalls with issue filter, empty chatIssues calls initData', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'issue'
      component.chatIssues = []
      component.checkForApiCalls()
      expect(component.initData).toHaveBeenCalled()
    })

    it('checkForApiCalls reuses existing chatIssues', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'issue'
      component.chatIssues = [{ x: 1 }]
      component.checkForApiCalls()
      expect(component.initData).not.toHaveBeenCalled()
    })

    it('checkForApiCalls calls getLanguages when no faq-languages', () => {
      jest.spyOn(component, 'getLanguages').mockImplementation(jest.fn())
      setupLocalStorage({ 'faq-languages': JSON.stringify([]), 'faq': '{}' })
      component.checkForApiCalls()
      expect(component.getLanguages).toHaveBeenCalled()
    })

    it('checkForApiCalls calls getLanguages when filter data missing', () => {
      jest.spyOn(component, 'getLanguages').mockImplementation(jest.fn())
      setupLocalStorage({
        'faq-languages': JSON.stringify([{ value: 'en' }]),
        'faq': JSON.stringify({ en: {} }),
        'selectedLanguage': 'en'
      })
      component.currentFilter = 'information'
      component.checkForApiCalls()
      expect(component.getLanguages).toHaveBeenCalled()
    })

    it('checkForAIQuestionResponse does not throw', () => {
      expect(() => component.checkForAIQuestionResponse()).not.toThrow()
    })
  })

  // ── Search ──────────────────────────────────────────────────────────────────
  describe('Search', () => {
    beforeEach(() => {
      component.aiSearchResultArr = []
      component.searchAPIResponseInProgress = false
    })

    it('submitSearchQuery prevents empty search', () => {
      const event = { preventDefault: jest.fn() }
      component.searchQuery = ''
      component.submitSearchQuery({} as any, event)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('submitSearchQuery prevents whitespace-only search', () => {
      const event = { preventDefault: jest.fn() }
      component.searchQuery = '   '
      component.submitSearchQuery({} as any, event)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('submitSearchQuery submits valid query', () => {
      jest.spyOn(component, 'aiGlobalSearch').mockImplementation(jest.fn())
      jest.spyOn(component, 'resetTextAreaHeight').mockImplementation(jest.fn())
      const event = { preventDefault: jest.fn() }
      component.searchQuery = 'test query'
      component.submitSearchQuery({} as any, event)
      expect(component.aiSearchResultArr.length).toBeGreaterThan(0)
      expect(component.searchQuery).toBe('')
      expect(component.aiGlobalSearch).toHaveBeenCalled()
    })

    it('submitSearchQuery blocks when API in progress', () => {
      jest.spyOn(component, 'aiGlobalSearch').mockImplementation(jest.fn())
      const event = { preventDefault: jest.fn() }
      component.searchQuery = 'test'
      component.searchAPIResponseInProgress = true
      component.submitSearchQuery({} as any, event)
      expect(component.aiGlobalSearch).not.toHaveBeenCalled()
    })

    it('submitSearchQuery emits scrollToBottomEvent when > 2 items', () => {
      jest.spyOn(component, 'aiGlobalSearch').mockImplementation(jest.fn())
      jest.spyOn(component, 'resetTextAreaHeight').mockImplementation(jest.fn())
      const event = { preventDefault: jest.fn() }
      component.searchQuery = 'test'
      component.aiSearchResultArr = [{ x: 1 }, { x: 2 }, { x: 3 }]
      component.submitSearchQuery({} as any, event)
      expect(component.aiGlobalSearch).toHaveBeenCalled()
    })

    it('aiGlobalSearch handles successful response with answer and chunks', () => {
      const chunks = [{
        Identifier: 'id1', Name: 'N1', Description: '  Desc  ', ContentType: 'Resource',
        mimeType: 'video/mp4', contentStart: '30', ContentEnd: '60'
      }]
      const resp = { answer: Array(35).fill('word').join(' '), RetrievedChunks: chunks, query_id: 'q1', query: 'test' }
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(of(resp))
      component.aiGlobalSearch()
      expect(component.searchAPIResponseInProgress).toBe(false)
      expect(component.resultFetch).toBe(true)
      expect(component.iGOTAISearchResultArr.length).toBeGreaterThan(0)
    })

    it('aiGlobalSearch handles empty answer with chunks', () => {
      const resp = { answer: '', RetrievedChunks: [{ Identifier: 'id', Name: 'N', Description: 'D', ContentType: 'R', mimeType: 'video/mp4', contentStart: ' ', ContentEnd: ' ' }], query_id: 'q1', query: 'test' }
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(of(resp))
      component.aiGlobalSearch()
      const last = component.aiSearchResultArr[component.aiSearchResultArr.length - 1]
      expect(last.showSimiliarResultsFlag).toBe(true)
    })

    it('aiGlobalSearch handles empty answer and no chunks', () => {
      const resp = { answer: '', RetrievedChunks: [], query_id: 'q1', query: 'test' }
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(of(resp))
      component.aiGlobalSearch()
      const last = component.aiSearchResultArr[component.aiSearchResultArr.length - 1]
      expect(last.showFromInternet).toBe(true)
    })

    it('aiGlobalSearch handles PDF mimeType', () => {
      const resp = {
        answer: 'ans', RetrievedChunks: [{ Identifier: 'pid', Name: 'P', Description: 'D', ContentType: 'Resource', mimeType: 'application/pdf', contentStart: '5', ContentEnd: '5' }],
        query_id: 'q1', query: 'test'
      }
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(of(resp))
      component.aiGlobalSearch()
      expect(component.iGOTAISearchResultArr[0].resourceLink).toContain('player/pdf')
    })

    it('aiGlobalSearch handles video with zero start/end', () => {
      const resp = {
        answer: 'ans', RetrievedChunks: [{ Identifier: 'vid', Name: 'V', Description: 'D', ContentType: 'Resource', mimeType: 'video/mp4', contentStart: '0', ContentEnd: '0' }],
        query_id: 'q1', query: 'test'
      }
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(of(resp))
      component.aiGlobalSearch()
      expect(component.iGOTAISearchResultArr[0].resourceLink).not.toContain('st=')
    })

    it('aiGlobalSearch handles API error', () => {
      mockServices.chatbotService.aiGlobalSearch.mockReturnValue(throwError(() => new Error('fail')))
      component.aiGlobalSearch()
      expect(component.searchAPIResponseInProgress).toBe(false)
      expect(component.hasError).toBe(true)
    })
  })

  // ── Internet Search ─────────────────────────────────────────────────────────
  describe('Internet Search', () => {
    beforeEach(() => {
      component.aiSearchResultArr = [{ showFromInternet: true, showSimiliarResultsFlag: true, result: [], answer: '' }]
      component.cloneSearchQuery = 'query'
      component.userInfo = { professionalDetails: [{ designation: 'Dev' }], departmentName: 'IT' }
    })

    it('callFromInternet calls internet API and updates array', () => {
      component.callFromInternet({ answer: '' }, 0)
      expect(mockServices.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalled()
      expect(component.aiSearchResultArr[0].showFromInternet).toBe(false)
    })

    it('callFromInternet skips API when item has answer', () => {
      component.callFromInternet({ answer: 'existing' }, 0)
      expect(mockServices.chatbotService.aiGlobalSearchFromInternet).not.toHaveBeenCalled()
    })

    it('callFromInternet handles missing professional details', () => {
      component.userInfo = { departmentName: 'IT' }
      component.callFromInternet({ answer: '' }, 0)
      expect(mockServices.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalledWith(
        expect.objectContaining({ designation: '' }), expect.any(String), expect.any(String)
      )
    })

    it('callFromInternet handles missing department', () => {
      component.userInfo = { professionalDetails: [{ designation: 'Dev' }] }
      component.callFromInternet({ answer: '' }, 0)
      expect(mockServices.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalledWith(
        expect.objectContaining({ department: '' }), expect.any(String), expect.any(String)
      )
    })

    it('callFromInternet handles missing userInfo', () => {
      component.userInfo = {}
      component.callFromInternet({ answer: '' }, 0)
      expect(mockServices.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalledWith(
        expect.objectContaining({ designation: '', department: '' }), expect.any(String), expect.any(String)
      )
    })

    it('rejectFromInternet sets resultFetch and filters empty messages', () => {
      component.aiSearchResultArr = [{ showFromInternet: true, newMessage: 'msg' }, { newMessage: 'valid' }]
      component.rejectFromInternet(0)
      expect(component.resultFetch).toBe(true)
    })

    it('viewSimiliarResults shows chunks and hides other flags', () => {
      component.aiSearchResultArr = [{ showReterivedChunks: false, showSimiliarResultsFlag: true, showFromInternet: true }]
      component.viewSimiliarResults(0)
      expect(component.aiSearchResultArr[0].showReterivedChunks).toBe(true)
      expect(component.aiSearchResultArr[0].showSimiliarResultsFlag).toBe(false)
      expect(component.aiSearchResultArr[0].showFromInternet).toBe(false)
    })
  })

  // ── Feedback ────────────────────────────────────────────────────────────────
  describe('Feedback', () => {
    beforeEach(() => {
      component.aiSearchResultArr = [{ result: [{ query_id: 'qid', feedback: '', showLoader: false, showLoaderForUp: false, showLoaderForDown: false }] }]
    })

    it('sharePositiveContentRating calls API and sets feedback up on success', () => {
      component.sharePositiveContentRating({ query_id: 'qid' }, 0, 0)
      expect(mockServices.chatbotService.saveAIChatPositiveContentRating).toHaveBeenCalled()
      expect(component.aiSearchResultArr[0].result[0].feedback).toBe('up')
      expect(mockServices.matSnackBarNew.open).toHaveBeenCalledWith('Thank you for your feedback.', 'X', expect.any(Object))
    })

    it('sharePositiveContentRating shows error snack on API failure', () => {
      mockServices.chatbotService.saveAIChatPositiveContentRating.mockReturnValue(of({ status: 'error' }))
      component.sharePositiveContentRating({ query_id: 'qid' }, 0, 0)
      expect(mockServices.matSnackBarNew.open).toHaveBeenCalledWith('Something is wrong. Please try again later.', 'X', expect.any(Object))
    })

    it('sharePositiveContentRating handles missing outer array index gracefully', () => {
      component.aiSearchResultArr = []
      expect(() => component.sharePositiveContentRating({}, 5, 0)).not.toThrow()
    })

    it('openAIFeedbackPopup opens dialog and calls shareAIFeedback', () => {
      jest.spyOn(component, 'shareAIFeedback')
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(mockServices.dialog.open).toHaveBeenCalled()
      expect(component.shareAIFeedback).toHaveBeenCalled()
    })

    it('openAIFeedbackPopup shows error when feedback already submitted', () => {
      component.aiSearchResultArr[0].result[0].feedback = 'down'
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(mockServices.matSnackBarNew.open).toHaveBeenCalledWith('You have already submitted feedback', 'X', expect.any(Object))
    })

    it('openAIFeedbackPopup does not call shareAIFeedback when dialog closed without result', () => {
      mockServices.dialog.open.mockReturnValue({ afterClosed: () => of(null), close: jest.fn() })
      jest.spyOn(component, 'shareAIFeedback')
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(component.shareAIFeedback).not.toHaveBeenCalled()
    })

    it('shareAIFeedback calls API and sets feedback down on success', () => {
      component.shareAIFeedback({ query_id: 'qid' }, 'bad', 0, 0)
      expect(mockServices.chatbotService.shareAIFeedback).toHaveBeenCalled()
      expect(component.aiSearchResultArr[0].result[0].feedback).toBe('down')
    })

    it('shareAIFeedback shows error snack on failure', () => {
      mockServices.chatbotService.shareAIFeedback.mockReturnValue(of({ status: 'error' }))
      component.shareAIFeedback({ query_id: 'qid' }, 'bad', 0, 0)
      expect(mockServices.matSnackBarNew.open).toHaveBeenCalledWith('Something is wrong. Please try again later.', 'X', expect.any(Object))
    })

    it('shareAIFeedback handles missing array indices', () => {
      component.aiSearchResultArr = [{ result: [] }]
      expect(() => component.shareAIFeedback({}, 'fb', 0, 5)).not.toThrow()
    })
  })

  // ── Utility Functions ───────────────────────────────────────────────────────
  describe('Utility Functions', () => {
    it('copyPath for Resource PDF builds correct URL', () => {
      const item = { contentType: 'Resource', mimeType: 'application/pdf', identifier: 'pid', pageNumber: 3 }
      expect(() => component.copyPath(item, 1)).not.toThrow()
      expect(component.copiedIndex).toBe(1)
    })

    it('copyPath for Resource video with time range builds correct URL', () => {
      const item = { contentType: 'Resource', mimeType: 'video/mp4', identifier: 'vid', contentStart: 10, contentEnd: 40 }
      expect(() => component.copyPath(item, 2)).not.toThrow()
      expect(component.copiedIndex).toBe(2)
    })

    it('copyPath for Resource video with zero time range omits st/et', () => {
      const item = { contentType: 'Resource', mimeType: 'video/mp4', identifier: 'vid', contentStart: 0, contentEnd: 0 }
      expect(() => component.copyPath(item, 0)).not.toThrow()
    })

    it('copyPath for Course builds TOC URL', () => {
      const item = { contentType: 'Course', identifier: 'cid' }
      expect(() => component.copyPath(item, 0)).not.toThrow()
    })

    it('copyPath sets copiedIndex immediately', () => {
      const item = { contentType: 'Course', identifier: 'cid' }
      component.copyPath(item, 5)
      expect(component.copiedIndex).toBe(5)
    })

    it('redirectToResource opens PDF URL', () => {
      component.redirectToResource({ mimeType: 'application/pdf', identifier: 'pid', pageNumber: 2 })
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('player/pdf/pid'), '_blank')
    })

    it('redirectToResource opens video URL with time range', () => {
      component.redirectToResource({ mimeType: 'video/mp4', identifier: 'vid', contentStart: 5, contentEnd: 25 })
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('st=5&et=25'), '_blank')
    })

    it('redirectToResource opens video URL without time range', () => {
      component.redirectToResource({ mimeType: 'video/mp4', identifier: 'vid', contentStart: 0, contentEnd: 0 })
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('player/video/vid'), '_blank')
    })

    it('redirectToToc dispatches telemetry and opens URL', () => {
      component.redirectToToc({ identifier: 'cid', contentType: 'Course' })
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('/app/toc/cid/overview'), '_blank')
    })

    it('splitParagraphByWords splits to 30 words by default', () => {
      const para = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ')
      const result = component.splitParagraphByWords(para)
      expect(result.trim().split(/\s+/).length).toBe(30)
    })

    it('splitParagraphByWords respects custom count', () => {
      const para = 'a b c d e f g h i j'
      const result = component.splitParagraphByWords(para, 5)
      expect(result.trim().split(/\s+/).length).toBe(5)
    })

    it('toggleShow sets showLess to true for "less"', () => {
      component.aiSearchResultArr = [{ showLess: false }]
      component.toggleShow(0, 'less')
      expect(component.aiSearchResultArr[0].showLess).toBe(true)
    })

    it('toggleShow sets showLess to false for "more"', () => {
      component.aiSearchResultArr = [{ showLess: true }]
      component.toggleShow(0, 'more')
      expect(component.aiSearchResultArr[0].showLess).toBe(false)
    })

    it('userInitials getter returns initials', () => {
      component.initials = 'AB'
      expect(component.userInitials).toBe('AB')
    })

    it('loadFailedData calls aiGlobalSearch', () => {
      jest.spyOn(component, 'aiGlobalSearch').mockImplementation(jest.fn())
      component.loadFailedData()
      expect(component.aiGlobalSearch).toHaveBeenCalled()
    })

    it('random property is a string', () => {
      expect(typeof component.random).toBe('string')
    })
  })

  // ── Telemetry ───────────────────────────────────────────────────────────────
  describe('Telemetry', () => {
    it('raiseCategotyTelemetry dispatches event', () => {
      component.raiseCategotyTelemetry('cat1')
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseChatStartTelemetry dispatches event', () => {
      component.raiseChatStartTelemetry()
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseChatEndTelemetry dispatches event', () => {
      component.raiseChatEndTelemetry()
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseTemeletyInterat dispatches event for information', () => {
      component.currentFilter = 'information'
      component.raiseTemeletyInterat('q1')
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseTemeletyInterat dispatches event for issue', () => {
      component.currentFilter = 'issue'
      component.raiseTemeletyInterat('q2')
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseTelemetryForResource dispatches event', () => {
      component.raiseTelemetryForResource({ identifier: 'rid', contentType: 'Resource' })
      expect(mockServices.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })
  })

  // ── Textarea / Container ────────────────────────────────────────────────────
  describe('Textarea Management', () => {
    it('resizeTextarea sets height to auto and uses requestAnimationFrame', (done) => {
      const mockTextArea = { style: { height: '30px' }, scrollHeight: 80 } as any
      const origRAF = (global as any).requestAnimationFrame;
      (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ paddingTop: '10px', paddingBottom: '10px' } as any)

      component.resizeTextarea(mockTextArea, 'input')
      expect(mockTextArea.style.height).toBe('auto')

      setTimeout(() => {
        expect(mockTextArea.style.height).toBe('80px')
        expect(component.containerHeight).toBe(100);
        (global as any).requestAnimationFrame = origRAF
        done()
      }, 10)
    })

    it('resizeTextarea does not throw for null', () => {
      expect(() => component.resizeTextarea(null as any, '')).not.toThrow()
    })

    it('resetTextAreaHeight trims searchQuery and resets height', (done) => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ paddingTop: '0px', paddingBottom: '0px' } as any)
      component.searchQuery = '  trimmed  '
      component.resetTextAreaHeight({} as any)
      setTimeout(() => {
        expect(component.searchQuery).toBe('trimmed')
        expect(component.textArea.nativeElement.style.height).toBe('30px')
        done()
      }, 10)
    })
  })
})
