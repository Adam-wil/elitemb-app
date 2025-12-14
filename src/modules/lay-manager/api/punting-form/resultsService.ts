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
    console.log(`[getRaceTimesForTrack] Fetching race times for ${trackName} on ${date}`)

    const meeting = await findMeetingByTrack(trackName, date)
    if (!meeting) {
      console.warn(`[getRaceTimesForTrack] No meeting found for ${trackName} on ${date} - races will be marked as "not found"`)
      return raceTimes
    }

    // meetingId is string from API, convert to number
    const meetingIdNum = parseInt(meeting.meetingId, 10)
    console.log(`[getRaceTimesForTrack] Found meeting ID: ${meetingIdNum} for ${meeting.track?.name}`)

    // FIRST: Check if races field in meeting has the times (most efficient)
    if (meeting.races && Array.isArray(meeting.races) && meeting.races.length > 0) {
      console.log(`[getRaceTimesForTrack] Meeting has races field with ${meeting.races.length} races - extracting times directly`)

      // Log sample race to see structure
      console.log(`[getRaceTimesForTrack] Sample meeting race (JSON):`, JSON.stringify(meeting.races[0], null, 2))

      meeting.races.forEach((race: any) => {
        console.log(`[getRaceTimesForTrack] Meeting race ${race.raceNumber}: raceTime = "${race.raceTime}"`)
        if (race.raceTime && race.raceNumber) {
          const time = normalizeTimeFormat(race.raceTime)
          raceTimes.set(race.raceNumber, time)
          console.log(`  ✓ Race ${race.raceNumber}: ${time}`)
        }
      })

      if (raceTimes.size > 0) {
        console.log(`[getRaceTimesForTrack] Successfully extracted ${raceTimes.size} race times from meetings list`)
        return raceTimes
      }
    } else {
      console.log(`[getRaceTimesForTrack] Meeting races field is null/empty, trying form endpoint...`)
    }

    // Try to get form data first (has race times before races are run)
    const formData = await getMeetingForm(meetingIdNum)
    console.log(`[getRaceTimesForTrack] Form data response:`, formData ? `Meeting ${formData.meetingId}` : 'null')

    if (formData) {
      console.log(`[getRaceTimesForTrack] Form data structure:`, {
        meetingId: formData.meetingId,
        track: formData.track,
        racesCount: formData.races?.length || 0,
      })
      if (formData.races?.[0]) {
        console.log(`[getRaceTimesForTrack] Sample form race (JSON):`, JSON.stringify(formData.races[0], null, 2))
      }
    }

    if (formData && formData.races && formData.races.length > 0) {
      console.log(`[getRaceTimesForTrack] Got form data with ${formData.races.length} races`)
      formData.races.forEach((race: PFRaceField) => {
        console.log(`[getRaceTimesForTrack] Form race ${race.raceNumber}: raceTime = "${race.raceTime}"`)
        if (race.raceTime) {
          // Normalize time format to HH:mm
          const time = normalizeTimeFormat(race.raceTime)
          raceTimes.set(race.raceNumber, time)
          console.log(`  ✓ Race ${race.raceNumber}: ${time}`)
        } else {
          console.warn(`  ✗ Race ${race.raceNumber}: raceTime is null/undefined/empty`)
        }
      })
      return raceTimes
    }

    console.log(`[getRaceTimesForTrack] No form data, trying results data...`)

    // Fallback to results if form data not available
    const results = await getMeetingResults(meetingIdNum)
    if (results && results.raceResults) {
      console.log(`[getRaceTimesForTrack] Got results data with ${results.raceResults.length} races`)

      // Debug: Log first race structure to see what fields are available
      if (results.raceResults.length > 0) {
        console.log(`[getRaceTimesForTrack] Sample race (JSON):`, JSON.stringify(results.raceResults[0], null, 2))
      }

      results.raceResults.forEach((race) => {
        console.log(`[getRaceTimesForTrack] Processing race ${race.raceNumber}, raceTime field:`, race.raceTime)

        if (race.raceTime) {
          const time = normalizeTimeFormat(race.raceTime)
          raceTimes.set(race.raceNumber, time)
          console.log(`  ✓ Race ${race.raceNumber}: ${time}`)
        } else {
          console.warn(`  ✗ Race ${race.raceNumber}: No raceTime field found`)
        }
      })
    } else {
      console.warn(`[getRaceTimesForTrack] No results data available for meeting ${meetingIdNum}`)
    }

    return raceTimes
  } catch (error) {
    console.error('[getRaceTimesForTrack] Error:', error)
    return raceTimes
  }
}
