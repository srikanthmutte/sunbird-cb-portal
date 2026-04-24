import { SupportAIComponent } from './support-ai.component'
import { NavigationEnd } from '@angular/router'
import { SimpleChange } from '@angular/core'
import { of } from 'rxjs'

jest.mock('../../../environments/environment', () => ({
  environment: { supportEmail: 'test@gov.in' }
}))
jest.mock('@sunbird-cb/collection/src/lib/_common/non-relevent-feedback-dialog/non-relevent-feedback-dialog.component', () => ({
  NonReleventFeedbackDialogComponent: class { }
}), { virtual: true })
jest.mock('lodash/cloneDeep', () => ({
  __esModule: true,
  default: (v: any) => JSON.parse(JSON.stringify(v))
}))

const makeFaqData = () => JSON.stringify({
  en: {
    information: {
      quesMap: [{ quesId: '1', quesValue: 'Q1', ansVal: 'A1' }],
      recommendationMap: [
        { catId: 'c1', categoryType: 'Logged-In', priority: 1, recommendedQues: [{ priority: 1, quesID: '1' }] }
      ],
      categoryMap: [{ catId: 'c1', catName: 'Cat1' }]
    },
    issue: { quesMap: [], recommendationMap: [], categoryMap: [] }
  }
})

describe('SupportAIComponent', () => {
  let component: SupportAIComponent
  let mockSvc: any
  let scrollToSpy: jest.SpyInstance
  let windowOpenSpy: jest.SpyInstance

  const setupLS = (overrides: Record<string, string> = {}) => {
    localStorage.clear()
    const defaults: Record<string, string> = {
      'selectedLanguage': 'en',
      'faq': makeFaqData(),
      'faq-languages': JSON.stringify([{ value: 'en', label: 'English' }])
    }
    Object.entries({ ...defaults, ...overrides }).forEach(([k, v]) => localStorage.setItem(k, v))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setupLS()
    scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => { })
    windowOpenSpy = jest.spyOn(window, 'open').mockReturnValue(null as any);
    (document as any).execCommand = jest.fn()

    mockSvc = {
      configSvc: {
        userProfile: { firstName: 'John', profileImageUrl: '', professionalDetails: [{ designation: 'Dev' }], departmentName: 'IT' }
      },
      eventSvc: { dispatchChatbotEvent: jest.fn() },
      renderer: { addClass: jest.fn(), removeClass: jest.fn() },
      chatbotService: {
        getChatData: jest.fn(() => of({ payload: { config: {} } })),
        getLangugages: jest.fn(() => of({ status: { code: 200 }, payload: { languages: [{ value: 'en', label: 'English' }] } })),
        aiStartChathForSupport: jest.fn(() => of({ message: 'hi' })),
        aiSendChathForSupport: jest.fn(() => of({ text: 'Reply text', RetrievedChunks: [] })),
        aiGlobalSearchFromInternet: jest.fn(() => of({ answer: 'Internet answer', query_id: 'iid' })),
        saveAIChatPositiveContentRating: jest.fn(() => of({ status: 'success' })),
        shareAIFeedback: jest.fn(() => of({ status: 'success' })),
        iGOTAIChatHistory: []
      },
      dialog: {
        open: jest.fn(() => ({ afterClosed: () => of('bad feedback'), close: jest.fn() }))
      },
      matSnackBarNew: { open: jest.fn() },
      router: { events: of(new NavigationEnd(1, '/home', '/home')) }
    }

    component = new SupportAIComponent(
      mockSvc.configSvc, mockSvc.eventSvc, mockSvc.renderer,
      mockSvc.chatbotService, mockSvc.dialog, mockSvc.matSnackBarNew, mockSvc.router
    )
    component.textArea = { nativeElement: { style: { height: '30px' }, scrollHeight: 50, value: '' } } as any;
    (component as any).myScrollContainer = { nativeElement: { scrollTop: 0, scrollHeight: 100 } }
    component.scrollToBottomEvent = { emit: jest.fn() } as any
  })

  // ── Initialization ──────────────────────────────────────────────────────────
  describe('Initialization', () => {
    it('creates with default values', () => {
      expect(component).toBeDefined()
      expect(component.showIcon).toBe(true)
      expect(component.currentFilter).toBe('information')
      expect(component.selectedLaguage).toBe('en')
      expect(component.copiedIndex).toBe(-1)
      expect(component.containerHeight).toBe(36)
    })

    it('ngOnInit sets userIcon from profileImageUrl', () => {
      mockSvc.configSvc.userProfile.profileImageUrl = 'http://img.png'
      component.ngOnInit()
      expect(component.userIcon).toBe('http://img.png')
    })

    it('ngOnInit creates initials when no profileImageUrl', () => {
      mockSvc.configSvc.userProfile.profileImageUrl = ''
      component.ngOnInit()
      expect(component.initials).toBeDefined()
      expect(component.initials.length).toBeGreaterThanOrEqual(1)
    })

    it('ngOnInit detects /certs route', () => {
      mockSvc.router.events = of(new NavigationEnd(1, '/certs', '/certs'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(false)
    })

    it('ngOnInit detects /public/certs route', () => {
      mockSvc.router.events = of(new NavigationEnd(1, '/public/certs', '/public/certs'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(false)
    })

    it('ngOnInit detects other route → isHubEnable true', () => {
      mockSvc.router.events = of(new NavigationEnd(1, '/dashboard', '/dashboard'))
      component.ngOnInit()
      expect(component.isHubEnable).toBe(true)
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

    it('checkForAIQuestionResponse does not throw', () => {
      expect(() => component.checkForAIQuestionResponse()).not.toThrow()
    })
  })

  // ── ngOnChanges ─────────────────────────────────────────────────────────────
  describe('ngOnChanges', () => {
    it('triggers startNewSupportAISearch when chatId changes', () => {
      jest.spyOn(component, 'startNewSupportAISearch').mockImplementation(jest.fn())
      component.ngOnChanges({
        chatId: new SimpleChange('old', 'new', false)
      })
      expect(component.startNewSupportAISearch).toHaveBeenCalled()
      expect(component.startNewChat).toBe(true)
    })

    it('does not trigger when chatId is same', () => {
      jest.spyOn(component, 'startNewSupportAISearch').mockImplementation(jest.fn())
      component.ngOnChanges({
        chatId: new SimpleChange('same', 'same', false)
      })
      expect(component.startNewSupportAISearch).not.toHaveBeenCalled()
    })

    it('does not trigger when no chatId change', () => {
      jest.spyOn(component, 'startNewSupportAISearch').mockImplementation(jest.fn())
      component.ngOnChanges({})
      expect(component.startNewSupportAISearch).not.toHaveBeenCalled()
    })
  })

  // ── Localization ─────────────────────────────────────────────────────────────
  describe('Localization', () => {
    it('greetings returns Namaste for en', () => {
      component.selectedLaguage = 'en'
      expect(component.greetings()).toBe('Namaste')
    })

    it('greetings returns Hindi for hi', () => {
      component.selectedLaguage = 'hi'
      expect(component.greetings()).toBe('नमस्ते')
    })

    it('getInfoText returns known key', () => {
      component.selectedLaguage = 'en'
      expect(component.getInfoText('information')).toBe('Information')
    })

    it('getInfoText returns label as-is for unknown key', () => {
      component.selectedLaguage = 'en'
      expect(component.getInfoText('unknown')).toBe('unknown')
    })

    it('showMore returns correct text', () => {
      component.selectedLaguage = 'en'
      expect(component.showMore()).toBe('Show More')
    })
  })

  // ── Data Management ─────────────────────────────────────────────────────────
  describe('Data Management', () => {
    it('getData calls chatbotService', () => {
      jest.spyOn(component, 'setDataToLocalStorage').mockImplementation(jest.fn())
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.getData()
      expect(mockSvc.chatbotService.getChatData).toHaveBeenCalledWith({ lang: 'en', config_type: 'IN' })
      expect(component.displayLoader).toBe(false)
    })

    it('getData for issue filter', () => {
      jest.spyOn(component, 'setDataToLocalStorage').mockImplementation(jest.fn())
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.currentFilter = 'issue'
      component.selectedLaguage = 'hi'
      component.getData()
      expect(mockSvc.chatbotService.getChatData).toHaveBeenCalledWith({ lang: 'hi', config_type: 'IS' })
    })

    it('getData does not set displayLoader false when no payload', () => {
      mockSvc.chatbotService.getChatData.mockReturnValue(of({}))
      component.getData()
      expect(component.displayLoader).toBe(true)
    })

    it('setDataToLocalStorage writes to localStorage', () => {
      jest.spyOn(component, 'toggleFilter').mockImplementation(jest.fn())
      localStorage.setItem('faq', '{}')
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.setDataToLocalStorage({ q: 1 })
      expect(localStorage.getItem('faq')).toBeTruthy()
      expect(component.toggleFilter).toHaveBeenCalledWith('information')
    })

    it('setDataToLocalStorage for issue filter', () => {
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

    it('initData pushes data and calls getQns', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getPriorityQuestion').mockReturnValue([])
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      component.responseData = { quesMap: [], recommendationMap: [] }
      component.initData({})
      expect(component.pushData).toHaveBeenCalled()
      expect(component.getQns).toHaveBeenCalled()
    })

    it('selectLaguage updates selectedLaguage', () => {
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.selectLaguage({ target: { value: 'hi' } })
      expect(component.selectedLaguage).toBe('hi')
      expect(localStorage.getItem('selectedLanguage')).toBe('hi')
    })

    it('readFromLocalStorage sets responseData for information', () => {
      const stored = { en: { information: { type: 'i' }, issue: { type: 'is' } } }
      localStorage.setItem('result', JSON.stringify(stored))
      component.currentFilter = 'information'
      component.selectedLaguage = 'en'
      component.readFromLocalStorage()
      expect(component.responseData).toEqual({ type: 'i' })
    })

    it('readFromLocalStorage handles null', () => {
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

    it('iconClick start sets showIcon false and calls raiseChatStartTelemetry', () => {
      jest.spyOn(component, 'raiseChatStartTelemetry')
      component.showIcon = true
      component.iconClick('start')
      expect(component.showIcon).toBe(false)
      expect(component.raiseChatStartTelemetry).toHaveBeenCalled()
    })

    it('iconClick end toggles showIcon and resets state', () => {
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
      expect(component.more).toBe(false)
      expect(component.raiseChatEndTelemetry).toHaveBeenCalled()
    })

    it('toggleFilter sets currentFilter', () => {
      jest.spyOn(component, 'checkForApiCalls').mockImplementation(jest.fn())
      component.toggleFilter('issue')
      expect(component.currentFilter).toBe('issue')
      expect(component.more).toBe(false)
    })

    it('selectedQuestion pushes messages and raises telemetry', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'raiseTemeletyInterat')
      component.questionsAndAns = { q1: { quesValue: 'Q?', ansVal: 'Ans' } }
      component.currentFilter = 'information'
      const data: any = { selectedValue: '' }
      component.selectedQuestion({ quesID: 'q1', recommendedQues: [] }, data)
      expect(data.selectedValue).toBe('q1')
      expect(component.pushData).toHaveBeenCalledTimes(2)
    })

    it('pushData appends to chatInformation', () => {
      component.currentFilter = 'information'
      component.chatInformation = []
      component.pushData({ type: 'msg' })
      expect(component.chatInformation).toHaveLength(1)
    })

    it('pushData appends to chatIssues', () => {
      component.currentFilter = 'issue'
      component.chatIssues = []
      component.pushData({ type: 'msg' })
      expect(component.chatIssues).toHaveLength(1)
    })

    it('getuserjourney filters by tab', () => {
      (component as any).userJourney = [{ tab: 'information' }, { tab: 'issue' }]
      expect(component.getuserjourney('information')).toHaveLength(1)
    })

    it('scrollToBottom sets scrollTop', () => {
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
      expect(mockSvc.renderer.addClass).toHaveBeenCalledWith(document.body, 'disable-scroll')
    })

    it('enableScroll calls renderer.removeClass', () => {
      (component as any).enableScroll()
      expect(mockSvc.renderer.removeClass).toHaveBeenCalledWith(document.body, 'disable-scroll')
    })
  })

  // ── Priority Questions & Categories ─────────────────────────────────────────
  describe('Priority Questions and Categories', () => {
    beforeEach(() => {
      component.responseData = {
        recommendationMap: [
          { catId: 'c1', categoryType: 'Logged-In', priority: 1, recommendedQues: [{ priority: 1, quesID: '1' }] },
          { catId: 'c2', categoryType: 'Not Logged-In', priority: 2, recommendedQues: [{ priority: 1, quesID: '2' }] },
          { catId: 'c3', categoryType: 'Both', priority: 3, recommendedQues: [{ priority: 1, quesID: '3' }] }
        ],
        categoryMap: [
          { catId: 'c1', catName: 'C1' }, { catId: 'c2', catName: 'C2' }, { catId: 'c3', catName: 'C3' }
        ]
      }
    })

    it('getPriorityQuestion for logged-in user', () => {
      component.userInfo = { firstName: 'John' }
      expect(component.getPriorityQuestion(1).length).toBeGreaterThan(0)
    })

    it('getPriorityQuestion for not-logged-in user', () => {
      component.userInfo = null
      expect(component.getPriorityQuestion(1).length).toBeGreaterThan(0)
    })

    it('showMoreQuestion calls pushData', () => {
      jest.spyOn(component, 'getPriorityQuestion').mockReturnValue([])
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      component.showMoreQuestion()
      expect(component.pushData).toHaveBeenCalled()
    })

    it('showCategory for "all" calls sortCategory', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'sortCategory').mockReturnValue([])
      component.showCategory({ catId: 'all', catName: 'All' })
      expect(component.pushData).toHaveBeenCalledTimes(2)
    })

    it('showCategory for specific category calls raiseCategotyTelemetry', () => {
      jest.spyOn(component, 'pushData').mockImplementation(jest.fn())
      jest.spyOn(component, 'raiseCategotyTelemetry')
      component.showCategory({ catId: 'c1', catName: 'C1' })
      expect(component.raiseCategotyTelemetry).toHaveBeenCalledWith('c1')
    })

    it('getCategories populates categories', () => {
      component.userInfo = { firstName: 'J' }
      component.selectedLaguage = 'en'
      component.getCategories()
      expect(component.categories.length).toBeGreaterThan(0)
    })

    it('sortCategory sorts by priority', () => {
      component.categories = [{ priority: 2 }, { priority: 1 }] as any
      const sorted = component.sortCategory()
      expect(sorted[0].priority).toBe(1)
    })
  })

  // ── API Calls ─────────────────────────────────────────────────────────────
  describe('API Calls', () => {
    it('getLanguages calls getData on success', () => {
      jest.spyOn(component, 'getData').mockImplementation(jest.fn())
      component.getLanguages()
      expect(component.getData).toHaveBeenCalled()
      expect(component.displayLoader).toBe(false)
    })

    it('getLanguages keeps displayLoader true on non-200', () => {
      mockSvc.chatbotService.getLangugages.mockReturnValue(of({ status: { code: 400 } }))
      component.getLanguages()
      expect(component.displayLoader).toBe(true)
    })

    it('checkForApiCalls calls initData when chatInformation empty', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.chatInformation = []
      component.checkForApiCalls()
      expect(component.initData).toHaveBeenCalled()
    })

    it('checkForApiCalls reuses existing chatInformation', () => {
      jest.spyOn(component, 'initData').mockImplementation(jest.fn())
      jest.spyOn(component, 'getQns').mockImplementation(jest.fn())
      jest.spyOn(component, 'getCategories').mockImplementation(jest.fn())
      component.currentFilter = 'information'
      component.chatInformation = [{ x: 1 }]
      component.checkForApiCalls()
      expect(component.initData).not.toHaveBeenCalled()
    })

    it('checkForApiCalls calls getLanguages when no faq-languages', () => {
      jest.spyOn(component, 'getLanguages').mockImplementation(jest.fn())
      setupLS({ 'faq-languages': JSON.stringify([]), 'faq': '{}' })
      component.checkForApiCalls()
      expect(component.getLanguages).toHaveBeenCalled()
    })
  })

  // ── Support AI Search ────────────────────────────────────────────────────────
  describe('Support AI Search', () => {
    beforeEach(() => {
      component.aiSearchResultArr = []
      component.initiateSupportNewChat = false
    })

    it('submitSearchQuery returns false when initiateSupportNewChat is false', () => {
      component.searchQuery = 'test'
      const result = component.submitSearchQuery({} as any, { preventDefault: jest.fn() })
      expect(result).toBe(false)
    })

    it('submitSearchQuery submits when initiateSupportNewChat is true', () => {
      jest.spyOn(component, 'supportAISearch').mockImplementation(jest.fn())
      jest.spyOn(component, 'resetTextAreaHeight').mockImplementation(jest.fn())
      component.initiateSupportNewChat = true
      component.searchQuery = 'hello'
      const event = { preventDefault: jest.fn() }
      component.submitSearchQuery({} as any, event)
      expect(component.supportAISearch).toHaveBeenCalled()
    })

    it('submitSearchQuery prevents empty search when initiateSupportNewChat is true', () => {
      jest.spyOn(component, 'supportAISearch').mockImplementation(jest.fn())
      component.initiateSupportNewChat = true
      component.searchQuery = ''
      const event = { preventDefault: jest.fn() }
      component.submitSearchQuery({} as any, event)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('startNewSupportAISearch skips API when startNewChat is false', () => {
      component.startNewChat = false
      component.startNewSupportAISearch()
      expect(mockSvc.chatbotService.aiStartChathForSupport).not.toHaveBeenCalled()
    })

    it('startNewSupportAISearch calls API when startNewChat is true and sets initiateSupportNewChat', () => {
      component.startNewChat = true
      component.userInfo = { firstName: 'John' }
      component.startNewSupportAISearch()
      expect(mockSvc.chatbotService.aiStartChathForSupport).toHaveBeenCalled()
      expect(component.initiateSupportNewChat).toBe(true)
    })

    it('startNewSupportAISearch sets initiateSupportNewChat false when no message', () => {
      mockSvc.chatbotService.aiStartChathForSupport.mockReturnValue(of({}))
      component.startNewChat = true
      component.userInfo = { firstName: 'John' }
      component.startNewSupportAISearch()
      expect(component.initiateSupportNewChat).toBe(false)
    })

    it('supportAISearch skips when initiateSupportNewChat is false', () => {
      component.initiateSupportNewChat = false
      component.supportAISearch()
      expect(mockSvc.chatbotService.aiSendChathForSupport).not.toHaveBeenCalled()
    })

    it('supportAISearch calls API when initiateSupportNewChat is true', () => {
      component.initiateSupportNewChat = true
      component.supportAISearch()
      expect(mockSvc.chatbotService.aiSendChathForSupport).toHaveBeenCalled()
      expect(component.resultFetch).toBe(true)
    })

    it('supportAISearch handles text with more than 30 words', () => {
      const longText = Array(35).fill('word').join(' ')
      mockSvc.chatbotService.aiSendChathForSupport.mockReturnValue(of({ text: longText }))
      component.initiateSupportNewChat = true
      component.supportAISearch()
      const last = component.aiSearchResultArr[component.aiSearchResultArr.length - 1]
      expect(last.showLess).toBe(true)
    })
  })

  // ── Internet Search ──────────────────────────────────────────────────────────
  describe('Internet Search', () => {
    beforeEach(() => {
      component.aiSearchResultArr = [{ showFromInternet: true, answer: '', newMessage: '' }]
      component.cloneSearchQuery = 'query'
      component.userInfo = { professionalDetails: [{ designation: 'Dev' }], departmentName: 'IT' }
    })

    it('callFromInternet calls API when item has no answer', () => {
      component.callFromInternet({ answer: '' }, 0)
      expect(mockSvc.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalled()
    })

    it('callFromInternet skips API when item has answer', () => {
      component.callFromInternet({ answer: 'existing' }, 0)
      expect(mockSvc.chatbotService.aiGlobalSearchFromInternet).not.toHaveBeenCalled()
    })

    it('callFromInternet handles missing professionalDetails', () => {
      component.userInfo = { departmentName: 'IT' }
      component.callFromInternet({ answer: '' }, 0)
      expect(mockSvc.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalledWith(
        expect.objectContaining({ designation: '' }), expect.any(String), expect.any(String)
      )
    })

    it('callFromInternet handles missing departmentName', () => {
      component.userInfo = { professionalDetails: [{ designation: 'Dev' }] }
      component.callFromInternet({ answer: '' }, 0)
      expect(mockSvc.chatbotService.aiGlobalSearchFromInternet).toHaveBeenCalledWith(
        expect.objectContaining({ department: '' }), expect.any(String), expect.any(String)
      )
    })

    it('rejectFromInternet sets resultFetch true', () => {
      component.aiSearchResultArr = [{ showFromInternet: true, newMessage: 'msg' }]
      component.rejectFromInternet(0)
      expect(component.resultFetch).toBe(true)
    })
  })

  // ── Feedback ─────────────────────────────────────────────────────────────────
  describe('Feedback', () => {
    beforeEach(() => {
      component.aiSearchResultArr = [{ result: [{ query_id: 'qid', feedback: '' }] }]
    })

    it('sharePositiveContentRating calls API and sets feedback up', () => {
      component.sharePositiveContentRating({ query_id: 'qid' }, 0, 0)
      expect(mockSvc.chatbotService.saveAIChatPositiveContentRating).toHaveBeenCalled()
      expect(component.aiSearchResultArr[0].result[0].feedback).toBe('up')
    })

    it('sharePositiveContentRating shows error snack on failure', () => {
      mockSvc.chatbotService.saveAIChatPositiveContentRating.mockReturnValue(of({ status: 'error' }))
      component.sharePositiveContentRating({ query_id: 'qid' }, 0, 0)
      expect(mockSvc.matSnackBarNew.open).toHaveBeenCalledWith('Something is wrong. Please try again later.', 'X', expect.any(Object))
    })

    it('sharePositiveContentRating handles empty outer array', () => {
      component.aiSearchResultArr = []
      expect(() => component.sharePositiveContentRating({}, 5, 0)).not.toThrow()
    })

    it('openAIFeedbackPopup opens dialog', () => {
      jest.spyOn(component, 'shareAIFeedback')
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(mockSvc.dialog.open).toHaveBeenCalled()
      expect(component.shareAIFeedback).toHaveBeenCalled()
    })

    it('openAIFeedbackPopup shows error when already submitted', () => {
      component.aiSearchResultArr[0].result[0].feedback = 'down'
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(mockSvc.matSnackBarNew.open).toHaveBeenCalledWith('You have already submitted feedback', 'X', expect.any(Object))
    })

    it('openAIFeedbackPopup no shareAIFeedback when dialog returns null', () => {
      mockSvc.dialog.open.mockReturnValue({ afterClosed: () => of(null), close: jest.fn() })
      jest.spyOn(component, 'shareAIFeedback')
      component.openAIFeedbackPopup({ query_id: 'qid' }, 0, 0)
      expect(component.shareAIFeedback).not.toHaveBeenCalled()
    })

    it('shareAIFeedback sets feedback down on success', () => {
      component.shareAIFeedback({ query_id: 'qid' }, 'bad', 0, 0)
      expect(component.aiSearchResultArr[0].result[0].feedback).toBe('down')
    })

    it('shareAIFeedback shows error on failure', () => {
      mockSvc.chatbotService.shareAIFeedback.mockReturnValue(of({ status: 'error' }))
      component.shareAIFeedback({ query_id: 'qid' }, 'bad', 0, 0)
      expect(mockSvc.matSnackBarNew.open).toHaveBeenCalledWith('Something is wrong. Please try again later.', 'X', expect.any(Object))
    })
  })

  // ── Utility Functions ────────────────────────────────────────────────────────
  describe('Utility Functions', () => {
    it('copyPath for PDF', () => {
      expect(() => component.copyPath({ mimeType: 'application/pdf', identifier: 'pid', pageNumber: 2 }, 1)).not.toThrow()
      expect(component.copiedIndex).toBe(1)
    })

    it('copyPath for video', () => {
      expect(() => component.copyPath({ mimeType: 'video/mp4', identifier: 'vid', contentStart: 10, contentEnd: 40 }, 2)).not.toThrow()
      expect(component.copiedIndex).toBe(2)
    })

    it('redirectToResource opens PDF URL', () => {
      component.redirectToResource({ mimeType: 'application/pdf', identifier: 'pid', pageNumber: 2 })
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('player/pdf/pid'), '_blank')
    })

    it('redirectToResource opens video URL', () => {
      component.redirectToResource({ mimeType: 'video/mp4', identifier: 'vid', contentStart: 5, contentEnd: 25 })
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('player/video/vid'), '_blank')
    })

    it('redirectToToc dispatches telemetry and opens URL', () => {
      component.redirectToToc({ identifier: 'cid', contentType: 'Course' })
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
      expect(windowOpenSpy).toHaveBeenCalledWith(expect.stringContaining('/app/toc/cid/overview'), '_blank')
    })

    it('splitParagraphByWords defaults to 30 words', () => {
      const para = Array(50).fill('w').join(' ')
      expect(component.splitParagraphByWords(para).trim().split(/\s+/).length).toBe(30)
    })

    it('toggleShow sets showLess true', () => {
      component.aiSearchResultArr = [{ showLess: false }]
      component.toggleShow(0, 'less')
      expect(component.aiSearchResultArr[0].showLess).toBe(true)
    })

    it('toggleShow sets showLess false', () => {
      component.aiSearchResultArr = [{ showLess: true }]
      component.toggleShow(0, 'more')
      expect(component.aiSearchResultArr[0].showLess).toBe(false)
    })

    it('userInitials getter returns initials', () => {
      component.initials = 'AB'
      expect(component.userInitials).toBe('AB')
    })

    it('raiseTelemetryForResource dispatches event', () => {
      component.raiseTelemetryForResource({ identifier: 'rid', contentType: 'Resource' })
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })
  })

  // ── Telemetry ────────────────────────────────────────────────────────────────
  describe('Telemetry', () => {
    it('raiseCategotyTelemetry dispatches event', () => {
      component.raiseCategotyTelemetry('cat1')
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseChatStartTelemetry dispatches event', () => {
      component.raiseChatStartTelemetry()
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseChatEndTelemetry dispatches event', () => {
      component.raiseChatEndTelemetry()
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })

    it('raiseTemeletyInterat dispatches event', () => {
      component.currentFilter = 'information'
      component.raiseTemeletyInterat('q1')
      expect(mockSvc.eventSvc.dispatchChatbotEvent).toHaveBeenCalled()
    })
  })

  // ── Textarea ─────────────────────────────────────────────────────────────────
  describe('Textarea Management', () => {
    it('resizeTextarea sets height to auto', (done) => {
      const origRAF = (global as any).requestAnimationFrame;
      (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ paddingTop: '10px', paddingBottom: '10px' } as any)
      const ta = { style: { height: '30px' }, scrollHeight: 80 } as any
      component.resizeTextarea(ta, '')
      expect(ta.style.height).toBe('auto')
      setTimeout(() => {
        expect(ta.style.height).toBe('80px');
        (global as any).requestAnimationFrame = origRAF
        done()
      }, 10)
    })

    it('resizeTextarea does not throw for null', () => {
      expect(() => component.resizeTextarea(null as any, '')).not.toThrow()
    })

    it('resetTextAreaHeight trims searchQuery', (done) => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ paddingTop: '0px', paddingBottom: '0px' } as any)
      component.searchQuery = '  test  '
      component.resetTextAreaHeight({} as any)
      setTimeout(() => {
        expect(component.searchQuery).toBe('test')
        done()
      }, 10)
    })
  })
})
