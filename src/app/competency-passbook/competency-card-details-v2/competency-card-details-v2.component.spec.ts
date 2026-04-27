import { CompetencyCardDetailsV2Component } from './competency-card-details-v2.component';
import { of, throwError } from 'rxjs';
import { Subject } from 'rxjs';

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

jest.mock('src/environments/environment', () => ({
  environment: { contentHost: 'https://test.igot.gov.in' }
}), { virtual: true });

jest.mock('@sunbird-cb/collection/src/lib/_common/certificate-dialog/certificate-dialog.component', () => ({
  CertificateDialogComponent: class {},
}), { virtual: true });

jest.mock('../../../../project/ws/app/src/lib/routes/profile-v2/components/profile-revamp/certificate-view-popup/certificate-view-popup.component', () => ({
  CertificateViewPopupComponent: class {},
}), { virtual: true });

const langObs$ = new Subject<any>();

const makeComponent = () => {
  const actRouter: any = { queryParams: of({ theme: 'T1' }) };
  const router: any = { navigateByUrl: jest.fn() };
  const cpService: any = {
    getMyCompetencyList: jest.fn(() => of({ result: { competencies: [] } })),
    getIGOTCourseList: jest.fn(() => of({ result: { content: [] } })),
    getAcheivementsList: jest.fn(() => of({ result: { search_results: { data: [] } } })),
    getExternalCourseList: jest.fn(() => of({ data: [] })),
    fetchCertificate: jest.fn(() => of({ result: { printUri: 'data:image/svg;base64,abc' } })),
  };
  const translate: any = { setDefaultLang: jest.fn(), use: jest.fn() };
  const langtranslations: any = {
    languageSelectedObservable: langObs$,
    translateLabel: jest.fn((l: string) => l),
  };
  const events: any = { raiseInteractTelemetry: jest.fn() };
  const dialog: any = { open: jest.fn() };
  const matSnackBar: any = { open: jest.fn() };
  const pipeImgUrl: any = { transform: jest.fn((u: string) => u) };

  return {
    component: new CompetencyCardDetailsV2Component(
      actRouter, router, cpService, translate, langtranslations,
      events, dialog, matSnackBar, pipeImgUrl
    ),
    cpService, router, dialog, matSnackBar, events,
  };
};

describe('CompetencyCardDetailsV2Component', () => {
  let component: CompetencyCardDetailsV2Component;
  let cpService: any;
  let router: any;
  let dialog: any;
  let matSnackBar: any;
  let events: any;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    ({ component, cpService, router, dialog, matSnackBar, events } = makeComponent());
  });

  afterEach(() => {
    try { component.ngOnDestroy(); } catch {}
  });

  it('creates', () => {
    expect(component).toBeDefined();
  });

  it('reads detailsData from localStorage', () => {
    const data = { vCompetencyTheme: 'T1', subThemes: [] };
    localStorage.setItem('details_page_competency', JSON.stringify(data));
    const { component: c } = makeComponent();
    expect(c.detailsData).toEqual(data);
    c.ngOnDestroy();
  });

  it('handles websiteLanguage from localStorage on language change', () => {
    localStorage.setItem('websiteLanguage', 'hi');
    langObs$.next(null);
    expect(component).toBeDefined();
  });

  describe('ngOnInit', () => {
    it('calls getMyCompetencyList', () => {
      jest.spyOn(component, 'getMyCompetencyList');
      component.ngOnInit();
      expect(component.getMyCompetencyList).toHaveBeenCalled();
    });
  });

  describe('getMyCompetencyList', () => {
    it('sets myCompetencyList from response', () => {
      cpService.getMyCompetencyList.mockReturnValue(of({ result: { competencies: [{ id: 'c1' }] } }));
      component.getMyCompetencyList();
      expect(component.myCompetencyList).toHaveLength(1);
    });

    it('handles error from service', () => {
      cpService.getMyCompetencyList.mockReturnValue(throwError({ ok: false }));
      component.getMyCompetencyList();
      expect(matSnackBar.open).toHaveBeenCalled();
    });

    it('calls filterCompetenciesBySubThemes when competencies exist', () => {
      jest.spyOn(component, 'filterCompetenciesBySubThemes');
      cpService.getMyCompetencyList.mockReturnValue(of({ result: { competencies: [{ id: 'c1' }] } }));
      component.getMyCompetencyList();
      expect(component.filterCompetenciesBySubThemes).toHaveBeenCalled();
    });
  });

  describe('filterCompetenciesBySubThemes', () => {
    it('does nothing when myCompetencyList is empty', () => {
      component.myCompetencyList = [];
      component.detailsData = { subThemes: [{ id: 'st1', name: 'SubTheme1' }] };
      component.filterCompetenciesBySubThemes();
      expect(component.filteredIGOTCourses).toHaveLength(0);
    });

    it('does nothing when subThemes is empty', () => {
      component.myCompetencyList = [{ competencySubThemeId: 'st1' }];
      component.detailsData = { subThemes: [] };
      component.filterCompetenciesBySubThemes();
      expect(component.filteredIGOTCourses).toHaveLength(0);
    });

    it('processes competencies with iGOTCourses', () => {
      component.detailsData = { subThemes: [{ id: 'st1', name: 'SubTheme1' }] };
      component.myCompetencyList = [{
        competencySubThemeId: 'st1',
        competencyDetails: {
          iGOTCourses: [{ acquiredContextId: 'course1', name: 'C1' }],
        }
      }];
      component.filterCompetenciesBySubThemes();
      expect(component.filteredIGOTCourses.length).toBeGreaterThanOrEqual(1);
    });

    it('sets activeTab to iGOTCourses when filteredIGOTCourses exists', () => {
      component.detailsData = { subThemes: [{ id: 'st1', name: 'ST1' }] };
      component.myCompetencyList = [{
        competencySubThemeId: 'st1',
        competencyDetails: {
          iGOTCourses: [{ acquiredContextId: 'c1', name: 'C1' }],
        }
      }];
      component.filterCompetenciesBySubThemes();
      expect(component.activeTab).toBe('iGOTCourses');
    });

    it('sets activeTab to extCourses when only extCourses', () => {
      component.detailsData = { subThemes: [{ id: 'st1', name: 'ST1' }] };
      component.myCompetencyList = [{
        competencySubThemeId: 'st1',
        competencyDetails: {
          extCourses: [{ acquiredContextId: 'e1', name: 'E1' }],
        }
      }];
      component.filterCompetenciesBySubThemes();
      expect(component.activeTab).toBe('extCourses');
    });

    it('merges subtheme names for duplicate courses', () => {
      component.detailsData = {
        subThemes: [{ id: 'st1', name: 'ST1' }, { id: 'st2', name: 'ST2' }]
      };
      component.myCompetencyList = [
        {
          competencySubThemeId: 'st1',
          competencyDetails: {
            iGOTCourses: [{ acquiredContextId: 'c1' }],
          }
        },
        {
          competencySubThemeId: 'st2',
          competencyDetails: {
            iGOTCourses: [{ acquiredContextId: 'c1' }],
          }
        }
      ];
      component.filterCompetenciesBySubThemes();
      expect(component.filteredIGOTCourses[0].subThemes).toHaveLength(2);
    });
  });

  describe('fetchIGOTCourseDetails', () => {
    it('updates filteredIGOTCourses with names from response', () => {
      component.filteredIGOTCourses = [{ acquiredContextId: 'c1', subThemes: ['ST1'], viewMore: false }];
      cpService.getIGOTCourseList.mockReturnValue(of({ result: { content: [{ identifier: 'c1', name: 'Course A' }] } }));
      component.fetchIGOTCourseDetails();
      expect(component.filteredIGOTCourses[0].name).toBe('Course A');
    });

    it('handles error', () => {
      component.filteredIGOTCourses = [{ acquiredContextId: 'c1' }];
      cpService.getIGOTCourseList.mockReturnValue(throwError({ ok: false }));
      component.fetchIGOTCourseDetails();
      expect(matSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('fetchSelfAchievementCourseDetails', () => {
    it('updates filteredSelfAchievements with names from response', () => {
      component.filteredSelfAchievements = [{ acquiredContextId: 'a1', subThemes: ['ST1'], viewMore: false }];
      cpService.getAcheivementsList.mockReturnValue(of({
        result: { search_results: { data: [{ id: 'a1', contextData: { title: 'Achievement A' } }] } }
      }));
      component.fetchSelfAchievementCourseDetails();
      expect(component.filteredSelfAchievements[0].name).toBe('Achievement A');
    });

    it('handles error', () => {
      component.filteredSelfAchievements = [{ acquiredContextId: 'a1' }];
      cpService.getAcheivementsList.mockReturnValue(throwError({ ok: false }));
      component.fetchSelfAchievementCourseDetails();
      expect(matSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('fetchExtCourseDetails', () => {
    it('updates filteredExtCourses with names', () => {
      component.filteredExtCourses = [{ acquiredContextId: 'e1', subThemes: [], viewMore: false }];
      cpService.getExternalCourseList.mockReturnValue(of({ data: [{ contentId: 'e1', name: 'Ext Course A' }] }));
      component.fetchExtCourseDetails();
      expect(component.filteredExtCourses[0].name).toBe('Ext Course A');
    });

    it('handles error', () => {
      component.filteredExtCourses = [{ acquiredContextId: 'e1' }];
      cpService.getExternalCourseList.mockReturnValue(throwError({ ok: false }));
      component.fetchExtCourseDetails();
      expect(matSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('fetchExternalTrainingDetails', () => {
    it('updates filteredexternalTrainings with names', () => {
      component.filteredexternalTrainings = [{ acquiredContextId: 'et1', subThemes: [], viewMore: false }];
      cpService.getIGOTCourseList.mockReturnValue(of({ result: { Event: [{ identifier: 'et1', name: 'Training A' }] } }));
      component.fetchExternalTrainingDetails();
      expect(component.filteredexternalTrainings[0].name).toBe('Training A');
    });

    it('handles error', () => {
      component.filteredexternalTrainings = [{ acquiredContextId: 'et1' }];
      cpService.getIGOTCourseList.mockReturnValue(throwError({ ok: false }));
      component.fetchExternalTrainingDetails();
      expect(matSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('viewCertificate', () => {
    it('opens CertificateDialogComponent', () => {
      const obj: any = { certificateId: 'cert1' };
      component.viewCertificate(obj);
      expect(dialog.open).toHaveBeenCalled();
      expect(obj.loading).toBe(false);
    });

    it('handles error', () => {
      cpService.fetchCertificate.mockReturnValue(throwError({ ok: false }));
      const obj: any = { certificateId: 'cert1', loading: true };
      component.viewCertificate(obj);
      expect(obj.error).toBeDefined();
    });
  });

  describe('getCertificateSVG', () => {
    it('calls handleDownloadCertificatePDF when printURI exists and type is DOWNLOAD', () => {
      jest.spyOn(component, 'handleDownloadCertificatePDF').mockImplementation(jest.fn());
      const obj: any = { certificateId: 'cert1', printURI: 'data:image/svg;base64,xyz' };
      component.getCertificateSVG(obj, 'DOWNLOAD');
      expect(component.handleDownloadCertificatePDF).toHaveBeenCalledWith('data:image/svg;base64,xyz');
    });

    it('calls shareCertificate when type is SHARE', () => {
      jest.spyOn(component, 'shareCertificate').mockImplementation(jest.fn());
      const obj: any = { certificateId: 'cert1', printURI: 'data:svg' };
      component.getCertificateSVG(obj, 'SHARE');
      expect(component.shareCertificate).toHaveBeenCalledWith('cert1');
    });

    it('fetches cert when no printURI', () => {
      const obj: any = { certificateId: 'cert1' };
      component.getCertificateSVG(obj);
      expect(cpService.fetchCertificate).toHaveBeenCalledWith('cert1');
      expect(dialog.open).toHaveBeenCalled();
    });

    it('handles error when fetching cert', () => {
      cpService.fetchCertificate.mockReturnValue(throwError({ ok: false }));
      const obj: any = { certificateId: 'cert1' };
      component.getCertificateSVG(obj);
      expect(obj.error).toBeDefined();
    });
  });

  describe('shareCertificate', () => {
    it('opens linkedin URL', () => {
      const openSpy = jest.spyOn(window, 'open').mockReturnValue(null as any);
      component.shareCertificate('certId1');
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('linkedin.com'), '_blank');
    });
  });

  describe('handleNavigate', () => {
    it('navigates to ext course URL', () => {
      component.activeTab = 'extCourses';
      component.handleNavigate({ acquiredContextId: 'e1' });
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/toc/ext/e1');
    });

    it('navigates to iGOT course URL', () => {
      component.activeTab = 'iGOTCourses';
      component.handleNavigate({ acquiredContextId: 'c1' });
      expect(router.navigateByUrl).toHaveBeenCalledWith('app/toc/c1/overview');
    });

    it('does not navigate for selfAchievement', () => {
      component.activeTab = 'selfAchievement';
      component.handleNavigate({ acquiredContextId: 'a1' });
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('handleViewMore', () => {
    it('sets viewMore to true by default', () => {
      const obj: any = { viewMore: false };
      component.handleViewMore(obj);
      expect(obj.viewMore).toBe(true);
    });

    it('sets viewMore to false when flag provided', () => {
      const obj: any = { viewMore: true };
      component.handleViewMore(obj, 'close');
      expect(obj.viewMore).toBe(false);
    });
  });

  describe('raiseShareIntreactTelemetry', () => {
    it('calls raiseInteractTelemetry', () => {
      component.raiseShareIntreactTelemetry('cert1', 'share', 'click');
      expect(events.raiseInteractTelemetry).toHaveBeenCalled();
    });

    it('works without optional params', () => {
      component.raiseShareIntreactTelemetry();
      expect(events.raiseInteractTelemetry).toHaveBeenCalled();
    });
  });

  describe('assignData', () => {
    it('assigns filteredIGOTCourses', () => {
      component.filteredIGOTCourses = [{ name: 'C1' }];
      component.assignData('iGOTCourses');
      expect(component.currentTabData).toEqual([{ name: 'C1' }]);
    });

    it('assigns filteredExtCourses', () => {
      component.filteredExtCourses = [{ name: 'E1' }];
      component.assignData('extCourses');
      expect(component.currentTabData).toEqual([{ name: 'E1' }]);
    });

    it('assigns filteredSelfAchievements', () => {
      component.filteredSelfAchievements = [{ name: 'A1' }];
      component.assignData('selfAchievement');
      expect(component.currentTabData).toEqual([{ name: 'A1' }]);
    });

    it('assigns filteredexternalTrainings', () => {
      component.filteredexternalTrainings = [{ name: 'ET1' }];
      component.assignData('externalTraining');
      expect(component.currentTabData).toEqual([{ name: 'ET1' }]);
    });
  });

  describe('handleActiveTab', () => {
    it('resets viewMore and sets activeTab', () => {
      component.filteredIGOTCourses = [{ viewMore: true }];
      component.filteredIGOTCourses = [{ name: 'C1' }];
      component.handleActiveTab('iGOTCourses');
      expect(component.activeTab).toBe('iGOTCourses');
    });
  });

  describe('getUrl', () => {
    it('returns URL as-is for non-google-storage URL', () => {
      const url = 'https://example.com/cert/abc';
      expect(component.getUrl(url)).toBe(url);
    });

    it('transforms google storage URL', () => {
      const url = 'https://storage.googleapis.com/bucket/userAchievements/file.pdf';
      const result = component.getUrl(url);
      expect(result).toContain('/userAchievements/');
    });
  });

  describe('handleView', () => {
    it('opens cert URL in new tab', () => {
      const openSpy = jest.spyOn(window, 'open').mockReturnValue(null as any);
      component.handleView({ certificateId: 'https://example.com/cert.pdf' });
      expect(openSpy).toHaveBeenCalledWith('https://example.com/cert.pdf', '_blank');
    });
  });

  describe('openDocument', () => {
    it('opens CertificateViewPopupComponent when URL provided', () => {
      component.openDocument('https://example.com/doc.pdf');
      expect(dialog.open).toHaveBeenCalled();
    });

    it('does not open dialog when URL is empty', () => {
      component.openDocument('');
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
