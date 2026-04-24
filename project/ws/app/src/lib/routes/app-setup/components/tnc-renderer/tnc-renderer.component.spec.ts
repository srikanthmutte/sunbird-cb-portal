import { TncRendererComponent } from './tnc-renderer.component'

describe('TncRendererComponent (project)', () => {
  let component: TncRendererComponent

  beforeEach(() => {
    component = new TncRendererComponent()
  })

  it('creates', () => {
    expect(component).toBeTruthy()
  })

  it('ngOnInit sets currentPanel to tnc when generalTnc not accepted', () => {
    component.tncData = {
      isAccepted: false,
      termsAndConditions: [
        { name: 'Generic T&C', isAccepted: false },
        { name: 'DP', isAccepted: false }
      ]
    } as any
    component.ngOnInit()
    expect(component.currentPanel).toBe('tnc')
  })

  it('ngOnInit sets currentPanel to dp when dpTnc not accepted', () => {
    component.tncData = {
      isAccepted: false,
      termsAndConditions: [
        { name: 'Generic T&C', isAccepted: true },
        { name: 'DP', isAccepted: false }
      ]
    } as any
    component.ngOnInit()
    expect(component.currentPanel).toBe('dp')
  })

  it('ngOnInit does nothing when tncData is null', () => {
    component.tncData = null
    expect(() => component.ngOnInit()).not.toThrow()
  })

  it('isLocaleAvailable returns true when locale in availableLanguages', () => {
    component.generalTnc = { availableLanguages: ['en', 'hi'] } as any
    expect(component.isLocaleAvailable('en')).toBe(true)
  })

  it('isLocaleAvailable returns false when locale missing', () => {
    component.generalTnc = { availableLanguages: ['hi'] } as any
    expect(component.isLocaleAvailable('en')).toBe(false)
  })

  it('isLocaleAvailable returns false when generalTnc is null', () => {
    component.generalTnc = null
    expect(component.isLocaleAvailable('en')).toBe(false)
  })

  it('ngOnChanges calls assignGeneralAndDp', () => {
    component.tncData = {
      isAccepted: true,
      termsAndConditions: [{ name: 'Generic T&C', isAccepted: true }]
    } as any
    component.ngOnChanges()
    expect(component.generalTnc).toBeTruthy()
  })

  it('ngOnChanges does nothing when tncData is null', () => {
    component.tncData = null
    expect(() => component.ngOnChanges()).not.toThrow()
  })

  it('reCenterPanel does not throw', () => {
    expect(() => component.reCenterPanel()).not.toThrow()
  })

  it('changeTncLang emits locale.value', () => {
    jest.spyOn(component.tncChange, 'emit')
    component.changeTncLang({ value: 'hi' } as any)
    expect(component.tncChange.emit).toHaveBeenCalledWith('hi')
  })
});

