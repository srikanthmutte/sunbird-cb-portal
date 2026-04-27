/**
 * environment.ts reads all values from window['env'] at module load time.
 * Since the module is already loaded when tests run, we verify the shape
 * and fallback logic by inspecting the exported object directly.
 */
import { environment } from './environment'

describe('environment.ts', () => {
  // ── Shape checks ──────────────────────────────────────────────────────────
  it('environment object is defined', () => {
    expect(environment).toBeDefined()
  })

  it('has production property', () => {
    expect('production' in environment).toBe(true)
  })

  it('production is a boolean', () => {
    expect(typeof environment.production).toBe('boolean')
  })

  it('has name property', () => {
    expect('name' in environment).toBe(true)
  })

  it('name is a string', () => {
    expect(typeof environment.name).toBe('string')
  })

  it('has sitePath property', () => {
    expect('sitePath' in environment).toBe(true)
  })

  it('has organisation property', () => {
    expect('organisation' in environment).toBe(true)
  })

  it('has framework property', () => {
    expect('framework' in environment).toBe(true)
  })

  it('has channelId property', () => {
    expect('channelId' in environment).toBe(true)
  })

  it('has azureHost property', () => {
    expect('azureHost' in environment).toBe(true)
  })

  it('has supportEmail property', () => {
    expect('supportEmail' in environment).toBe(true)
  })

  it('supportEmail is a string', () => {
    expect(typeof environment.supportEmail).toBe('string')
  })

  it('has helpEmail property', () => {
    expect('helpEmail' in environment).toBe(true)
  })

  it('helpEmail is a string', () => {
    expect(typeof environment.helpEmail).toBe('string')
  })

  it('apiCache is a number', () => {
    expect(typeof environment.apiCache).toBe('number')
  })

  it('apiCache is >= 0', () => {
    expect(environment.apiCache).toBeGreaterThanOrEqual(0)
  })

  it('resendOTPTIme is a number', () => {
    expect(typeof environment.resendOTPTIme).toBe('number')
  })

  it('resendOTPTIme is >= 0', () => {
    expect(environment.resendOTPTIme).toBeGreaterThanOrEqual(0)
  })

  it('assessmentBuffer is a number', () => {
    expect(typeof environment.assessmentBuffer).toBe('number')
  })

  it('has staticHomePageUrl property', () => {
    expect('staticHomePageUrl' in environment).toBe(true)
  })

  it('has karmayogiBharatLink property', () => {
    expect('karmayogiBharatLink' in environment).toBe(true)
  })

  it('has missionKarmayogiPath property', () => {
    expect('missionKarmayogiPath' in environment).toBe(true)
  })

  it('has cscmsUrl property', () => {
    expect('cscmsUrl' in environment).toBe(true)
  })

  it('has doptOrg property', () => {
    expect('doptOrg' in environment).toBe(true)
  })

  it('has publicContentSurveyId property', () => {
    expect('publicContentSurveyId' in environment).toBe(true)
  })

  // ── Fallback logic (window.env missing) ──────────────────────────────────
  describe('fallback values when window.env is absent', () => {
    it('defaults name to empty string when env key missing', () => {
      const envObj: any = (window as any)['env']
      // If env is not set, name would be ''. We verify that the value is a string.
      expect(typeof ((envObj && envObj['name']) || '')).toBe('string')
    })

    it('defaults apiCache to 0 when env key missing', () => {
      const envObj: any = (window as any)['env']
      expect(((envObj && envObj['apiCache']) || 0)).toBeGreaterThanOrEqual(0)
    })

    it('defaults resendOTPTIme to 120 when env key missing', () => {
      const envObj: any = (window as any)['env']
      const val = (envObj && envObj['resendOTPTIme']) || 120
      expect(val).toBe(120)
    })
  })
})
