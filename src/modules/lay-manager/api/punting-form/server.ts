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
    const meetings = json.payLoad || json.payload || []

    // Debug: Log races field from first meeting
    if (meetings.length > 0) {
      const firstMeeting = meetings[0]
      console.log(`[Server] First meeting races field:`, {
        track: firstMeeting.track?.name,
        hasRaces: !!firstMeeting.races,
        racesType: Array.isArray(firstMeeting.races) ? 'array' : typeof firstMeeting.races,
        racesCount: Array.isArray(firstMeeting.races) ? firstMeeting.races.length : 'N/A'
      })

      if (firstMeeting.races && Array.isArray(firstMeeting.races) && firstMeeting.races.length > 0) {
        console.log(`[Server] Sample race from meetings list (JSON):`, JSON.stringify(firstMeeting.races[0], null, 2))
      }
    }

    return meetings
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

    // Debug: Log the structure of results response
    if (payload && payload.length > 0) {
      const firstMeeting = payload[0]
      console.log(`[Server] Results response for meeting ${meetingId}:`, {
        hasRaceResults: !!firstMeeting.raceResults,
        raceResultsCount: firstMeeting.raceResults?.length || 0,
        sampleRace: firstMeeting.raceResults?.[0] || 'none'
      })
    } else {
      console.log(`[Server] Results response for meeting ${meetingId}: null/empty payload`)
    }

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

    // Debug: Log raw API response structure
    console.log(`[Server] Form API raw response keys:`, Object.keys(json))
    console.log(`[Server] Form API response (first 500 chars):`, JSON.stringify(json).substring(0, 500))

    const payload = json.payLoad || json.payload

    // Debug: Log the structure of form response
    if (payload) {
      console.log(`[Server] Form payload type:`, Array.isArray(payload) ? 'array' : typeof payload)
      console.log(`[Server] Form payload structure:`, {
        isArray: Array.isArray(payload),
        length: Array.isArray(payload) ? payload.length : 'N/A',
        firstItem: Array.isArray(payload) && payload.length > 0 ? Object.keys(payload[0]) : 'N/A'
      })

      // If it's an array, get first item; otherwise use payload directly
      const meeting = Array.isArray(payload) ? payload[0] : payload

      if (meeting) {
        console.log(`[Server] Form meeting data:`, {
          meetingId: meeting.meetingId,
          track: meeting.track,
          hasRaces: !!meeting.races,
          racesCount: meeting.races?.length || 0,
        })

        if (meeting.races?.[0]) {
          console.log(`[Server] Sample form race (JSON):`, JSON.stringify(meeting.races[0], null, 2))
        }
      }
    } else {
      console.log(`[Server] Form response for meeting ${meetingId}: null/empty payload`)
    }

    // Return first item if array, otherwise return payload directly
    return Array.isArray(payload) ? payload[0] : payload
  })
