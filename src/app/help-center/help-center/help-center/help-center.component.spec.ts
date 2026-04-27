import { HelpCenterComponent } from './help-center.component'
import { of } from 'rxjs'

const makeConfig = () => ({
  roleTabs: [{ id: 'learner', label: 'Learner' }],
  contentTabs: [{ id: 'all', label: 'All' }],
  enabledSections: { videos: true, guides: true, faqs: false },
  videoTutorialsMap: { learner: [{ id: 'v1', title: 'Intro', youtubeUrl: 'https://youtube.com/watch?v=abc123', category: 'basics', date: '', thumbnail: '' }] },
  howToGuidesMap: { learner: [{ id: 'g1', title: 'Guide 1', titleHindi: 'गाइड 1', description: 'How to do', category: 'basics', pdfUrl: 'http://x.com/guide.pdf', thumbnail: '' }] },
  faqItemsMap: { learner: [{ id: 'f1', question: 'What is iGOT?', answer: 'A platform', category: 'general', tag: '', isOpen: false }] },
  videoCategoriesMap: { learner: [{ id: 'all', label: 'All' }, { id: 'basics', label: 'Basics' }] },
  guideCategoriesMap: { learner: [{ id: 'all', label: 'All' }] },
  faqCategoriesMap: { learner: [{ id: 'all', label: 'All' }] },
})

describe('HelpCenterComponent', () => {
  let component: HelpCenterComponent
  let mockSvc: any

  beforeEach(() => {
    mockSvc = { fetchHelpCenterConfig: jest.fn(() => of(makeConfig())) }
    component = new HelpCenterComponent(mockSvc)
    jest.spyOn(window, 'open').mockReturnValue(null as any)
  })

  afterEach(() => jest.restoreAllMocks())

  it('creates with defaults', () => {
    expect(component).toBeDefined()
    expect(component.activeRoleTab).toBe('learner')
    expect(component.activeContentTab).toBe('all')
  })

  describe('ngOnInit', () => {
    it('loads help center config', () => {
      component.ngOnInit()
      expect(component.helpCenterData).toBeDefined()
      expect(component.roleTabs).toHaveLength(1)
      expect(component.contentTabs).toHaveLength(1)
    })

    it('sets enabledSections', () => {
      component.ngOnInit()
      expect(component.enabledSections.videos).toBe(true)
      expect(component.enabledSections.faqs).toBe(false)
    })

    it('handles null config', () => {
      mockSvc.fetchHelpCenterConfig.mockReturnValue(of(null))
      component.ngOnInit()
      expect(component.helpCenterData).toBeNull()
    })
  })

  describe('isSectionEnabled', () => {
    beforeEach(() => component.ngOnInit())

    it('returns true for enabled section', () => {
      expect(component.isSectionEnabled('videos')).toBe(true)
    })

    it('returns false for disabled section', () => {
      expect(component.isSectionEnabled('faqs')).toBe(false)
    })

    it('returns true for unknown section (not explicitly false)', () => {
      expect(component.isSectionEnabled('unknown')).toBe(true)
    })
  })

  describe('filteredVideos', () => {
    beforeEach(() => component.ngOnInit())

    it('returns all when no search query', () => {
      expect(component.filteredVideos).toHaveLength(1)
    })

    it('filters by category', () => {
      component.activeVideoCategory = 'basics'
      expect(component.filteredVideos).toHaveLength(1)
    })

    it('filters by search query', () => {
      component.searchQuery = 'Intro'
      expect(component.filteredVideos).toHaveLength(1)
    })

    it('returns empty when no match', () => {
      component.searchQuery = 'zzznomatch'
      expect(component.filteredVideos).toHaveLength(0)
    })
  })

  describe('filteredGuides', () => {
    beforeEach(() => component.ngOnInit())

    it('returns all when no search', () => {
      expect(component.filteredGuides).toHaveLength(1)
    })

    it('filters by title', () => {
      component.searchQuery = 'Guide 1'
      expect(component.filteredGuides).toHaveLength(1)
    })

    it('filters by titleHindi', () => {
      component.searchQuery = 'गाइड'
      expect(component.filteredGuides).toHaveLength(1)
    })

    it('filters by description', () => {
      component.searchQuery = 'How to'
      expect(component.filteredGuides).toHaveLength(1)
    })

    it('returns empty when no match', () => {
      component.searchQuery = 'zzz'
      expect(component.filteredGuides).toHaveLength(0)
    })

    it('filters by category', () => {
      component.activeGuideCategory = 'other'
      expect(component.filteredGuides).toHaveLength(0)
    })
  })

  describe('filteredFaqs', () => {
    beforeEach(() => component.ngOnInit())

    it('returns all when no search', () => {
      expect(component.filteredFaqs).toHaveLength(1)
    })

    it('filters by question', () => {
      component.searchQuery = 'iGOT'
      expect(component.filteredFaqs).toHaveLength(1)
    })

    it('filters by answer', () => {
      component.searchQuery = 'platform'
      expect(component.filteredFaqs).toHaveLength(1)
    })

    it('filters by category', () => {
      component.activeFaqCategory = 'other'
      expect(component.filteredFaqs).toHaveLength(0)
    })
  })

  describe('showVideos / showGuides / showFaqs', () => {
    beforeEach(() => component.ngOnInit())

    it('showVideos is true when tab is all', () => {
      expect(component.showVideos).toBe(true)
    })

    it('showVideos is false when tab is faqs and no search', () => {
      component.activeContentTab = 'faqs'
      expect(component.showVideos).toBe(false)
    })

    it('showVideos is true when search matches videos', () => {
      component.searchQuery = 'Intro'
      expect(component.showVideos).toBe(true)
    })

    it('showFaqs is true when tab is faqs', () => {
      component.activeContentTab = 'faqs'
      expect(component.showFaqs).toBe(true)
    })

    it('showGuides is true when tab is guides', () => {
      component.activeContentTab = 'guides'
      expect(component.showGuides).toBe(true)
    })
  })

  describe('setRoleTab', () => {
    it('sets activeRoleTab and resets state', () => {
      component.setRoleTab('mdo-leader')
      expect(component.activeRoleTab).toBe('mdo-leader')
      expect(component.activeContentTab).toBe('all')
      expect(component.searchQuery).toBe('')
      expect(component.videoSectionOpen).toBe(true)
    })
  })

  describe('setContentTab', () => {
    it('sets activeContentTab', () => {
      component.setContentTab('videos')
      expect(component.activeContentTab).toBe('videos')
    })

    it('sets sections open for guides tab', () => {
      component.setContentTab('guides')
      expect(component.guidesSectionOpen).toBe(true)
    })

    it('sets sections open for faqs tab', () => {
      component.setContentTab('faqs')
      expect(component.faqSectionOpen).toBe(true)
    })
  })

  describe('toggleSection', () => {
    it('toggles videoSectionOpen', () => {
      component.videoSectionOpen = true
      component.toggleSection('video')
      expect(component.videoSectionOpen).toBe(false)
    })

    it('toggles guidesSectionOpen', () => {
      component.guidesSectionOpen = true
      component.toggleSection('guides')
      expect(component.guidesSectionOpen).toBe(false)
    })

    it('toggles faqSectionOpen', () => {
      component.faqSectionOpen = true
      component.toggleSection('faq')
      expect(component.faqSectionOpen).toBe(false)
    })
  })

  describe('toggleFaq', () => {
    it('toggles faq.isOpen', () => {
      const faq: any = { isOpen: false }
      component.toggleFaq(faq)
      expect(faq.isOpen).toBe(true)
      component.toggleFaq(faq)
      expect(faq.isOpen).toBe(false)
    })
  })

  describe('onSearch', () => {
    it('sets searchQuery from input event', () => {
      const input = document.createElement('input')
      input.value = 'hello'
      component.onSearch({ target: input } as any)
      expect(component.searchQuery).toBe('hello')
    })
  })

  describe('clearSearch', () => {
    it('clears searchQuery', () => {
      component.searchQuery = 'something'
      component.clearSearch()
      expect(component.searchQuery).toBe('')
    })
  })

  describe('getVideoCount / getGuideCount / getFaqCount', () => {
    beforeEach(() => component.ngOnInit())

    it('getVideoCount returns total for all', () => {
      expect(component.getVideoCount('all')).toBe(1)
    })

    it('getVideoCount filters by category', () => {
      expect(component.getVideoCount('basics')).toBe(1)
      expect(component.getVideoCount('other')).toBe(0)
    })

    it('getVideoCount filters by search', () => {
      component.searchQuery = 'Intro'
      expect(component.getVideoCount('all')).toBe(1)
      component.searchQuery = 'zzz'
      expect(component.getVideoCount('all')).toBe(0)
    })

    it('getGuideCount returns total for all', () => {
      expect(component.getGuideCount('all')).toBe(1)
    })

    it('getGuideCount filters by search', () => {
      component.searchQuery = 'How'
      expect(component.getGuideCount('all')).toBe(1)
    })

    it('getFaqCount returns total for all', () => {
      expect(component.getFaqCount('all')).toBe(1)
    })

    it('getFaqCount filters by search', () => {
      component.searchQuery = 'iGOT'
      expect(component.getFaqCount('all')).toBe(1)
    })
  })

  describe('allVideos / allGuides / allFaqs getters', () => {
    it('returns empty array when helpCenterData is null', () => {
      component.helpCenterData = null
      expect(component.allVideos).toEqual([])
      expect(component.allGuides).toEqual([])
      expect(component.allFaqs).toEqual([])
    })

    it('returns data for active role tab', () => {
      component.ngOnInit()
      expect(component.allVideos).toHaveLength(1)
    })
  })

  describe('videoCategories / guideCategories / faqCategories', () => {
    beforeEach(() => component.ngOnInit())

    it('returns videoCategories for active tab', () => {
      expect(component.videoCategories).toHaveLength(2)
    })

    it('returns guideCategories for active tab', () => {
      expect(component.guideCategories).toHaveLength(1)
    })

    it('returns faqCategories for active tab', () => {
      expect(component.faqCategories).toHaveLength(1)
    })
  })

  describe('hasAnySearchResult', () => {
    beforeEach(() => component.ngOnInit())

    it('returns true when no search query', () => {
      expect(component.hasAnySearchResult).toBe(true)
    })

    it('returns true when results exist', () => {
      component.searchQuery = 'iGOT'
      expect(component.hasAnySearchResult).toBe(true)
    })

    it('returns false when no results match', () => {
      component.searchQuery = 'zzznomatch'
      expect(component.hasAnySearchResult).toBe(false)
    })
  })

  describe('openVideo / openPDF', () => {
    it('opens youtube URL', () => {
      component.openVideo({ youtubeUrl: 'https://youtube.com/watch?v=abc', id: '', title: '', date: '', thumbnail: '', category: '' })
      expect(window.open).toHaveBeenCalledWith('https://youtube.com/watch?v=abc', '_blank')
    })

    it('does not open when no youtubeUrl', () => {
      component.openVideo({ youtubeUrl: '', id: '', title: '', date: '', thumbnail: '', category: '' })
      expect(window.open).not.toHaveBeenCalled()
    })

    it('opens PDF URL', () => {
      component.openPDF({ pdfUrl: 'http://x.com/g.pdf' })
      expect(window.open).toHaveBeenCalledWith('http://x.com/g.pdf', '_blank')
    })

    it('does not open PDF when pdf is null', () => {
      component.openPDF(null)
      expect(window.open).not.toHaveBeenCalled()
    })
  })

  describe('getYoutubeThumbnail', () => {
    it('returns thumbnail for watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=abc123'
      expect(component.getYoutubeThumbnail(url)).toContain('abc123')
    })

    it('returns thumbnail for youtu.be URL', () => {
      const url = 'https://youtu.be/abc123'
      expect(component.getYoutubeThumbnail(url)).toContain('abc123')
    })

    it('returns empty string for empty URL', () => {
      expect(component.getYoutubeThumbnail('')).toBe('')
    })

    it('returns empty string for non-youtube URL', () => {
      expect(component.getYoutubeThumbnail('https://vimeo.com/123')).toBe('')
    })
  })
})
