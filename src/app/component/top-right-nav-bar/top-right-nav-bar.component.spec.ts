import { TopRightNavBarComponent } from './top-right-nav-bar.component'
import { of } from 'rxjs'
import { Subject } from 'rxjs'

jest.mock('../../../environments/environment', () => ({ environment: { supportEmail: 'test@gov.in' } }))
jest.mock('@sunbird-cb/collection/src/lib/_common/confirm-dialog/confirm-dialog.component', () => ({ ConfirmDialogComponent: class { } }), { virtual: true })
jest.mock('@ws/app/src/lib/routes/peer-validation/components/survey-popup/survey-popup.component', () => ({ SurveyPopupComponent: class { } }), { virtual: true })
jest.mock('@ws/app/src/lib/routes/peer-validation/components/verification-request-dialog/verification-request-dialog.component', () => ({ VerificationRequestDialogComponent: class { } }), { virtual: true })
jest.mock('@ws/app/src/lib/routes/profile-v3/components/dialog-box/dialog-box.component', () => ({ DialogBoxComponent: class { } }), { virtual: true })
jest.mock('../dialog-box/dialog-box.component', () => ({ DialogBoxComponent: class { } }), { virtual: true })
jest.mock('src/app/services/notifications.service', () => ({ NotificationsService: class { } }), { virtual: true })
jest.mock('src/app/services/home-page.service', () => ({ HomePageService: class { } }), { virtual: true })
jest.mock('../root/root.service', () => ({ RootService: class { } }), { virtual: true })

describe('TopRightNavBarComponent', () => {
  let component: TopRightNavBarComponent
  let mockDialog: any
  let mockHomePageSvc: any
  let mockConfigSvc: any
  let mockLangTranslations: any
  let mockTranslate: any
  let mockHttp: any
  let mockSanitizer: any
  let mockEvents: any
  let mockSnackBar: any
  let mockRouter: any
  let mockNotificationsSvc: any
  let mockRootService: any
  let mockMatDialog: any

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()

    mockDialog = {
      open: jest.fn(() => ({ afterClosed: () => of(null), close: jest.fn() })),
    }
    mockHomePageSvc = { closeDialogPop: new Subject<any>() }
    mockConfigSvc = {
      unMappedUser: { id: 'u1', roles: ['admin'] },
      userProfile: { firstName: 'John', lastName: 'Doe', rootOrgId: 'org1' },
      iGOTAIConfig: null,
      languageTranslationFlag: { next: jest.fn() },
    }
    mockLangTranslations = {
      languageSelectedObservable: new Subject<any>(),
      translateLabel: jest.fn((l: string) => l),
      updatelanguageSelected: jest.fn(),
    }
    mockTranslate = { setDefaultLang: jest.fn(), use: jest.fn() }
    mockHttp = { get: jest.fn(() => of('<html>zoho</html>')) }
    mockSanitizer = { bypassSecurityTrustHtml: jest.fn((h: string) => h) }
    mockEvents = { raiseInteractTelemetry: jest.fn() }
    mockSnackBar = { open: jest.fn() }
    mockRouter = { navigate: jest.fn() }
    mockNotificationsSvc = {
      resetNotificationsCount: jest.fn(() => of({ responseCode: 'OK' })),
      handleRedirection: jest.fn(),
      nofificationsCount: { next: jest.fn() },
    }
    mockRootService = { openSupportAIChatbot: { next: jest.fn() } }
    mockMatDialog = {
      open: jest.fn(() => ({ afterClosed: () => of(null) })),
    }

    component = new TopRightNavBarComponent(
      mockDialog, mockHomePageSvc, mockConfigSvc, mockLangTranslations,
      mockTranslate, mockHttp, mockSanitizer, mockEvents, mockSnackBar,
      mockRouter, mockNotificationsSvc, mockRootService, mockMatDialog
    )
  })

  it('creates', () => {
    expect(component).toBeDefined()
    expect(component.selectedLanguage).toBe('en')
    expect(component.enableSupportAI).toBe(false)
  })

  it('reads language from localStorage in constructor', () => {
    localStorage.setItem('websiteLanguage', 'hi')
    component = new TopRightNavBarComponent(
      mockDialog, mockHomePageSvc, mockConfigSvc, mockLangTranslations,
      mockTranslate, mockHttp, mockSanitizer, mockEvents, mockSnackBar,
      mockRouter, mockNotificationsSvc, mockRootService, mockMatDialog
    )
    expect(component.selectedLanguage).toBe('hi')
  })

  describe('ngOnInit', () => {
    it('sets multiLang from instanceConfig', () => {
      mockConfigSvc.instanceConfig = { websitelanguages: ['en', 'hi'], isMultilingualEnabled: true }
      component.ngOnInit()
      expect(component.multiLang).toEqual(['en', 'hi'])
    })

    it('handles closeDialogPop event', () => {
      component.dialogRef = { close: jest.fn() }
      component.ngOnInit()
      mockHomePageSvc.closeDialogPop.next(true)
      expect(component.dialogRef.close).toHaveBeenCalled()
    })

    it('loads zohoHtml', () => {
      component.ngOnInit()
      expect(mockHttp.get).toHaveBeenCalled()
      expect(component.zohoHtml).toBeDefined()
    })

    it('adjusts rightNavConfig from topRightNavConfig', () => {
      component.rightNavConfig = { topRightNavConfig: [{ id: 1 }] }
      component.ngOnInit()
      expect(component.rightNavConfig).toEqual([{ id: 1 }])
    })
  })

  describe('ngOnChanges', () => {
    it('updates rightNavConfig from topRightNavConfig', () => {
      component.rightNavConfig = { topRightNavConfig: [{ id: 2 }] }
      component.ngOnChanges()
      expect(component.rightNavConfig).toEqual([{ id: 2 }])
    })

    it('keeps rightNavConfig as-is without topRightNavConfig', () => {
      component.rightNavConfig = [{ id: 3 }]
      component.ngOnChanges()
      expect(component.rightNavConfig).toEqual([{ id: 3 }])
    })
  })

  describe('translateLabels', () => {
    it('calls translateLabel', () => {
      component.translateLabels('Hello', 'label')
      expect(mockLangTranslations.translateLabel).toHaveBeenCalledWith('Hello', 'label', '')
    })
  })

  describe('onBellClick', () => {
    it('resets notificationsCount when > 0', () => {
      component.notificationsCount = 5
      component.onBellClick()
      expect(mockNotificationsSvc.resetNotificationsCount).toHaveBeenCalled()
      expect(component.notificationsCount).toBe(0)
    })

    it('sets showDropdown true after timeout', () => {
      jest.useFakeTimers()
      component.notificationsCount = 0
      component.onBellClick()
      jest.runAllTimers()
      expect(component.showDropdown).toBe(true)
      jest.useRealTimers()
    })

    it('handles error from resetNotificationsCount', () => {
      const errorSvc = { ...mockNotificationsSvc, resetNotificationsCount: jest.fn(() => ({ subscribe: (_s: any, e: any) => e(new Error('fail')) })) }
      component = new TopRightNavBarComponent(mockDialog, mockHomePageSvc, mockConfigSvc, mockLangTranslations, mockTranslate, mockHttp, mockSanitizer, mockEvents, mockSnackBar, mockRouter, errorSvc, mockRootService, mockMatDialog)
      component.notificationsCount = 5
      expect(() => component.onBellClick()).not.toThrow()
    })
  })

  describe('onMenuClosed', () => {
    it('sets showDropdown false', () => {
      component.showDropdown = true
      component.onMenuClosed()
      expect(component.showDropdown).toBe(false)
    })
  })

  describe('selectLanguage', () => {
    it('updates selectedLanguage and localStorage', () => {
      component.selectLanguage('hi')
      expect(component.selectedLanguage).toBe('hi')
      expect(localStorage.getItem('websiteLanguage')).toBe('hi')
      expect(mockLangTranslations.updatelanguageSelected).toHaveBeenCalled()
      expect(mockConfigSvc.languageTranslationFlag.next).toHaveBeenCalledWith(true)
    })
  })

  describe('formatDate', () => {
    it('formats valid date string', () => {
      const result = component.formatDate('2024-01-15')
      expect(result).toBe('15-01-2024')
    })

    it('returns empty for empty string', () => {
      expect(component.formatDate('')).toBe('')
    })

    it('returns original for invalid date', () => {
      expect(component.formatDate('notadate')).toBe('notadate')
    })
  })

  describe('openDialog', () => {
    it('opens DialogBoxComponent', () => {
      component.openDialog()
      expect(mockDialog.open).toHaveBeenCalled()
    })
  })

  describe('getZohoForm', () => {
    it('opens ZohoDialogComponent', () => {
      jest.useFakeTimers()
      component.getZohoForm()
      expect(mockDialog.open).toHaveBeenCalled()
      jest.runAllTimers()
      jest.useRealTimers()
    })
  })

  describe('reCountNotifications', () => {
    it('calls nofificationsCount.next', () => {
      component.reCountNotifications(5)
      expect(mockNotificationsSvc.nofificationsCount.next).toHaveBeenCalledWith(5)
    })
  })

  describe('calculateCount', () => {
    it('does not throw', () => {
      expect(() => component.calculateCount(10)).not.toThrow()
    })
  })

  describe('viewAllClick', () => {
    it('navigates to notifications for non-peer event string', () => {
      component.viewAllClick('unread')
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/notifications'], expect.any(Object))
    })

    it('calls handleRedirection for regular category event', () => {
      component.viewAllClick({ category: 'GENERAL' })
      expect(mockNotificationsSvc.handleRedirection).toHaveBeenCalled()
    })

    it('opens verification popup for PEER_REVIEW_ASSIGNED', () => {
      jest.spyOn(component, 'openVerificationPopup').mockImplementation(jest.fn())
      component.viewAllClick({ category: 'PEER_VALIDATION', sub_category: 'PEER_REVIEW_ASSIGNED' })
      expect(component.openVerificationPopup).toHaveBeenCalled()
    })

    it('opens survey popup for other PEER_VALIDATION', () => {
      jest.spyOn(component, 'openSurveypopup').mockImplementation(jest.fn())
      component.viewAllClick({ category: 'PEER_VALIDATION', sub_category: 'OTHER', sub_type: 'PEER_VALIDATION' })
      expect(component.openSurveypopup).toHaveBeenCalled()
    })
  })

  describe('openSurveypopup', () => {
    it('shows snack when status is SUBMITTED', () => {
      component.openSurveypopup({ status: 'SUBMITTED', message: { data: [{}] } })
      expect(mockSnackBar.open).toHaveBeenCalledWith('You have already completed the survey.', 'X', expect.any(Object))
    })

    it('shows snack when status is IGNORED', () => {
      component.openSurveypopup({ status: 'IGNORED', message: { data: [{}] } })
      expect(mockSnackBar.open).toHaveBeenCalledWith('You have already submitted the response.', 'X', expect.any(Object))
    })

    it('shows snack when survey end date passed', () => {
      component.openSurveypopup({ status: 'OPEN', message: { data: [{ surveyEndDate: '2000-01-01' }] } })
      expect(mockSnackBar.open).toHaveBeenCalledWith('Survey has ended.', 'X', expect.any(Object))
    })

    it('opens dialog for valid notification', () => {
      component.openSurveypopup({ status: 'OPEN', message: { data: [{}] } })
      expect(mockMatDialog.open).toHaveBeenCalled()
    })

    it('sets status to IGNORED when dialog closes with ignored', () => {
      mockMatDialog.open.mockReturnValue({ afterClosed: () => of('ignored') })
      const notif = { status: 'OPEN', message: { data: [{}] } }
      component.openSurveypopup(notif)
      expect(notif.status).toBe('IGNORED')
    })
  })

  describe('openVerificationPopup', () => {
    it('shows snack when status is APPROVED', () => {
      component.openVerificationPopup({ status: 'APPROVED', message: { data: [{}] } })
      expect(mockSnackBar.open).toHaveBeenCalledWith('You have already submitted the review.', 'X', expect.any(Object))
    })

    it('shows snack when status is REJECTED', () => {
      component.openVerificationPopup({ status: 'REJECTED', message: { data: [{}] } })
      expect(mockSnackBar.open).toHaveBeenCalled()
    })

    it('shows snack when status is IGNORED', () => {
      component.openVerificationPopup({ status: 'IGNORED', message: { data: [{}] } })
      expect(mockSnackBar.open).toHaveBeenCalled()
    })

    it('opens dialog for valid notification', () => {
      component.openVerificationPopup({ status: 'OPEN', message: { data: [{}] } })
      expect(mockMatDialog.open).toHaveBeenCalled()
    })

    it('sets status to IGNORED when dialog closes with ignored', () => {
      mockMatDialog.open.mockReturnValue({ afterClosed: () => of('ignored') })
      const notif = { status: 'OPEN', message: { data: [{}] } }
      component.openVerificationPopup(notif)
      expect(notif.status).toBe('IGNORED')
    })
  })

  describe('showDialog', () => {
    it('opens confirm dialog and opens URL on confirm', () => {
      const openSpy = jest.spyOn(window, 'open').mockReturnValue(null as any)
      mockDialog.open.mockReturnValue({ afterClosed: () => of(true) })
      component.showDialog({ title: 'test' }, 'http://test.com')
      expect(openSpy).toHaveBeenCalledWith('http://test.com', '_blank')
    })

    it('does not open URL when dialog returns false', () => {
      const openSpy = jest.spyOn(window, 'open').mockReturnValue(null as any)
      mockDialog.open.mockReturnValue({ afterClosed: () => of(false) })
      component.showDialog({}, 'http://test.com')
      expect(openSpy).not.toHaveBeenCalled()
    })
  })

  describe('raiseTelemetryEventForNotification', () => {
    it('calls raiseInteractTelemetry', () => {
      component.raiseTelemetryEventForNotification({ notification_id: 'n1' })
      expect(mockEvents.raiseInteractTelemetry).toHaveBeenCalled()
    })
  })

  describe('openSupportChatBot', () => {
    it('calls getZohoForm when no iGOTAIConfig', () => {
      jest.spyOn(component, 'getZohoForm').mockImplementation(jest.fn())
      component.openSupportChatBot()
      expect(component.getZohoForm).toHaveBeenCalled()
    })

    it('enables support AI when supportAI.all is true', () => {
      mockConfigSvc.iGOTAIConfig = { supportAI: { all: true } }
      component.openSupportChatBot()
      expect(component.enableSupportAI).toBe(true)
      expect(mockRootService.openSupportAIChatbot.next).toHaveBeenCalledWith(true)
    })

    it('enables support AI when org matches forOrg list', () => {
      mockConfigSvc.iGOTAIConfig = { supportAI: { all: false, forOrg: ['org1'] } }
      mockConfigSvc.userProfile = { rootOrgId: 'org1' }
      component.openSupportChatBot()
      expect(component.enableSupportAI).toBe(true)
    })
  })

  describe('constructor languageSelectedObservable callback', () => {
    it('updates language when observable fires and localStorage has language', () => {
      const langSubject = new Subject<void>()
      localStorage.setItem('websiteLanguage', 'hi')
      const newMockLang = {
        ...mockLangTranslations,
        languageSelectedObservable: langSubject.asObservable(),
      }
      const c = new TopRightNavBarComponent(
        mockDialog, mockHomePageSvc, mockConfigSvc, newMockLang,
        mockTranslate, mockHttp, mockSanitizer, mockEvents, mockSnackBar,
        mockRouter, mockNotificationsSvc, mockRootService, mockMatDialog
      )
      langSubject.next()
      expect(c.selectedLanguage).toBe('hi')
      expect(mockTranslate.use).toHaveBeenCalledWith('hi')
    })

    it('does not update language when localStorage is empty', () => {
      const langSubject = new Subject<void>()
      localStorage.removeItem('websiteLanguage')
      const newMockLang = {
        ...mockLangTranslations,
        languageSelectedObservable: langSubject.asObservable(),
      }
      new TopRightNavBarComponent(
        mockDialog, mockHomePageSvc, mockConfigSvc, newMockLang,
        mockTranslate, mockHttp, mockSanitizer, mockEvents, mockSnackBar,
        mockRouter, mockNotificationsSvc, mockRootService, mockMatDialog
      )
      jest.clearAllMocks()
      langSubject.next()
      expect(mockTranslate.use).not.toHaveBeenCalled()
    })
  })

  describe('callXMLRequest', () => {
    it('runs without throwing', () => {
      const origXHR = (global as any).XMLHttpRequest
      const mockXhr: any = {
        open: jest.fn(), send: jest.fn(), readyState: 0, status: 0,
        responseText: null, onreadystatechange: null,
      };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      expect(() => component.callXMLRequest()).not.toThrow()
      expect(mockXhr.open).toHaveBeenCalled();
      (global as any).XMLHttpRequest = origXHR
    })

    it('processes 200 response in onreadystatechange', () => {
      const origXHR = (global as any).XMLHttpRequest
      const mockXhr: any = {
        open: jest.fn(), send: jest.fn(), readyState: 4, status: 200,
        responseText: JSON.stringify({ captchaUrl: 'http://captcha.png', captchaDigest: 'abc123' }),
        onreadystatechange: null,
      };
      (global as any).XMLHttpRequest = jest.fn(() => mockXhr)
      component.callXMLRequest()
      // Simulate readyState change
      if (mockXhr.onreadystatechange) {
        expect(() => mockXhr.onreadystatechange()).not.toThrow()
      }
      (global as any).XMLHttpRequest = origXHR
    })
  })

  describe('openSurveypopup edge cases', () => {
    it('shows snack when notification.survey_end_date has passed', () => {
      const notification = {
        status: 'PENDING',
        message: { data: [{ surveyEndDate: null }] },
        survey_end_date: '2000-01-01T00:00:00Z',
      }
      component.openSurveypopup(notification)
      expect(mockSnackBar.open).toHaveBeenCalledWith('Survey has ended.', 'X', expect.anything())
    })

    it('sets status to IGNORED when dialog closes with ignored', () => {
      mockMatDialog.open = jest.fn(() => ({ afterClosed: () => of('ignored') }))
      const notification = {
        status: 'PENDING',
        notification_id: 'notif1',
        created_at: '2024-01-01',
        message: { data: [{ surveyEndDate: null, formId: 'form1', courseName: 'Test Course', completionDate: '2024-01-01' }] },
      }
      component.openSurveypopup(notification)
      expect(notification.status).toBe('IGNORED')
    })
  })
});

