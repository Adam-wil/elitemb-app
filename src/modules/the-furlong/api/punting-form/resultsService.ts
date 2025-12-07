/**
 * PuntingForm Results Service
 * Handles API calls for race results and form data
 * Uses server functions to bypass CORS
 */

import { findMeetingByTrack } from './meetingsService'
import { fetchResultsServer, fetchFormServer } from './server'
import type { PFMeetingResults, PFFormResponse, PFRaceField } from './types'

/**
 * Get race results for a meeting
 * Uses server function to bypass CORS
 */
export async function getMeetingResults(
  meetingId: number,
  raceNumber?: number
): Promise<PFMeetingResults | null> {
  try {
    console.log(`[ResultsService] Getting results for meeting ${meetingId}, race ${raceNumber || 'all'}`)
    // Server function with inputValidator: caller passes { data: {...} }, handler receives { data: {...} }
    const result = await fetchResultsServer({ data: { meetingId, raceNumber } })
    console.log(`[ResultsService] Got results:`, result ? 'yes' : 'no')
    return result
  } catch (error) {
    console.error('getMeetingResults error:', error)
    throw error
  }
}

/**
 * Get form/field data for a meeting (includes race times before results)
 * Uses server function to bypass CORS
 */
export async function getMeetingForm(
  meetingId: number,
  raceNumber?: number
): Promise<PFFormResponse | null> {
  try {
    console.log(`[ResultsService] Getting form for meeting ${meetingId}`)
    // Server function with inputValidator: caller passes { data: {...} }, handler receives { data: {...} }
    const result = await fetchFormServer({ data: { meetingId, raceNumber } })
    return result
  } catch (error) {
    console.error('getMeetingForm error:', error)
    throw error
  }
}

/**
 * Normalize time format to HH:mm
 */
function normalizeTimeFormat(time: string): string {
  // Handle various time formats
  // "14:30", "2:30 PM", "14:30:00", etc.

  // If already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }

  // Try to parse and format
  const match = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?/i)
  if (match) {
    let hours = parseInt(match[1])
    const minutes = match[2]
    const ampm = match[4]?.toUpperCase()

    if (ampm === 'PM' && hours < 12) {
      hours += 12
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }

  return time
}

/**
 * Get race times for a specific track and date
 * Returns a map of raceNumber -> raceTime
 */
export async function getRaceTimesForTrack(
  trackName: string,
  date: string
): Promise<Map<number, string>> {
  const raceTimes = new Map<number, string>()

  try {
    const meeting = await findMeetingByTrack(trackName, date)
    if (!meeting) {
      console.warn(`No meeting found for ${trackName} on ${date}`)
      return raceTimes
    }

    // meetingId is string from API, convert to number
    const meetingIdNum = parseInt(meeting.meetingId, 10)

    // Try to get form data first (has race times before races are run)
    const formData = await getMeetingForm(meetingIdNum)
    if (formData && formData.races) {
      formData.races.forEach((race: PFRaceField) => {
        if (race.raceTime) {
          // Normalize time format to HH:mm
          const time = normalizeTimeFormat(race.raceTime)
          raceTimes.set(race.raceNumber, time)
        }
      })
      return raceTimes
    }

    // Fallback to results if form data not available
    const results = await getMeetingResults(meetingIdNum)
    if (results && results.raceResults) {
      results.raceResults.forEach((race) => {
        if (race.raceTime) {
          const time = normalizeTimeFormat(race.raceTime)
          raceTimes.set(race.raceNumber, time)
        }
      })
    }

    return raceTimes
  } catch (error) {
    console.error('getRaceTimesForTrack error:', error)
    return raceTimes
  }
}
