/**
 * PuntingForm Server Functions
 * These run on the server to bypass CORS restrictions
 *
 * TanStack Start's createServerFn() handles server/client boundary automatically.
 * DO NOT use 'use server' directive - it's for React Server Components, not TanStack Start.
 */

import { createServerFn } from '@tanstack/react-start'

const PUNTING_FORM_API_BASE = 'https://api.puntingform.com.au/v2/form'

// Get API key from environment (server-side)
function getApiKey(): string {
  return process.env.VITE_PUNTING_FORM_API_KEY || ''
}

/**
 * Server function to fetch meetings list
 */
export const fetchMeetingsServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { date: string; jurisdiction?: string }) => d)
  .handler(async ({ data }) => {
    const { date, jurisdiction } = data

    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('PuntingForm API key is not configured')
    }

    const url = new URL(`${PUNTING_FORM_API_BASE}/meetingslist`)
    url.searchParams.append('apiKey', apiKey)
    url.searchParams.append('meetingDate', date)
    url.searchParams.append('stage', 'A')
    url.searchParams.append('includeBarrierTrials', 'false')

    if (jurisdiction) {
      url.searchParams.append('jurisdiction', jurisdiction)
    }

    console.log(`[Server] Fetching meetings for ${date}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    return json.payLoad || json.payload || []
  })

/**
 * Server function to fetch race results
 */
export const fetchResultsServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { meetingId: number; raceNumber?: number }) => d)
  .handler(async ({ data }) => {
    const { meetingId, raceNumber } = data

    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('PuntingForm API key is not configured')
    }

    const url = new URL(`${PUNTING_FORM_API_BASE}/results`)
    url.searchParams.append('apiKey', apiKey)
    url.searchParams.append('meetingId', meetingId.toString())

    if (raceNumber) {
      url.searchParams.append('raceNumber', raceNumber.toString())
    }

    console.log(`[Server] Fetching results for meeting ${meetingId}, race ${raceNumber || 'all'}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    const payload = json.payLoad || json.payload
    return payload?.[0] || null
  })

/**
 * Server function to fetch form data
 */
export const fetchFormServer = createServerFn({ method: 'GET' })
  .inputValidator((d: { meetingId: number; raceNumber?: number }) => d)
  .handler(async ({ data }) => {
    const { meetingId, raceNumber } = data

    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('PuntingForm API key is not configured')
    }

    const url = new URL(`${PUNTING_FORM_API_BASE}/form`)
    url.searchParams.append('apiKey', apiKey)
    url.searchParams.append('meetingId', meetingId.toString())

    if (raceNumber) {
      url.searchParams.append('raceNumber', raceNumber.toString())
    }

    console.log(`[Server] Fetching form for meeting ${meetingId}`)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    return json.payLoad || json.payload || null
  })
