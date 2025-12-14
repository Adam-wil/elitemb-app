/**
 * PuntingForm API Configuration
 */

// API Base URL
export const PUNTING_FORM_API_BASE = 'https://api.puntingform.com.au/v2/form'

// Get API key from environment variable
export function getApiKey(): string {
  const apiKey = import.meta.env.VITE_PUNTING_FORM_API_KEY
  if (!apiKey) {
    console.warn('VITE_PUNTING_FORM_API_KEY is not set in environment variables')
  }
  return apiKey || ''
}

// API Endpoints
export const ENDPOINTS = {
  MEETINGS_LIST: 'meetingslist',
  MEETINGS_LIST_CSV: 'meetingslist/csv',
  RESULTS: 'results',
  FORM: 'form',
} as const

// Jurisdictions (Australian states)
export const JURISDICTIONS = {
  NSW: '1',
  VIC: '2',
  QLD: '3',
  SA: '4',
  WA: '5',
  TAS: '6',
  NT: '7',
  ACT: '8',
} as const

// Time tolerance for validation (in minutes)
// Race times can sometimes be off by a minute or two
export const TIME_VALIDATION_TOLERANCE_MINUTES = 2
