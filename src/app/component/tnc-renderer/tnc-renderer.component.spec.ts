import { TncRendererComponent } from './tnc-renderer.component'

describe('TncRendererComponent', () => {
  let component: TncRendererComponent
  let mockConfigSvc: any

  beforeEach(() => {
    mockConfigSvc = { restrictedFeatures: new Set<string>() }
    component = new TncRendererComponent(mockConfigSvc)
  })

  it('creates', () => {
    expect(component).toBeTruthy()
  })

  it('sets termsOfUser false when restrictedFeatures has termsOfUser', () => {
    mockConfigSvc.restrictedFeatures = new Set(['termsOfUser'])
    component = new TncRendererComponent(mockConfigSvc)
    expect(component.termsOfUser).toBe(false)
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

  it('ngOnChanges calls assignGeneralAndDp when tncData present', () => {
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

  it('changeTncLang emits locale', () => {
    jest.spyOn(component.tncChange, 'emit')
    component.changeTncLang('hi')
    expect(component.tncChange.emit).toHaveBeenCalledWith('hi')
  })

  it('changeDpLang emits locale', () => {
    jest.spyOn(component.dpChange, 'emit')
    component.changeDpLang('en')
    expect(component.dpChange.emit).toHaveBeenCalledWith('en')
  })
});

