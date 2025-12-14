/**
 * PuntingForm Tracker Results Service
 * Handles fetching race results for the tracker's auto-result feature
 */

import { findMeetingByTrack } from './meetingsService'
import { getMeetingResults } from './resultsService'
import type { RaceResultData } from '../../types'
import type { PFRaceResult, PFRunner } from './types'

/**
 * Fetch race result for a specific track and race
 * Returns null if result not yet available
 */
export async function fetchRaceResult(
  track: string,
  date: string,
  raceNumber: number
): Promise<RaceResultData | null> {
  console.log(`[TrackerResults] Fetching result for ${track} R${raceNumber} on ${date}`)

  try {
    // Find the meeting for this track
    const meeting = await findMeetingByTrack(track, date)
    if (!meeting) {
      console.warn(`[TrackerResults] No meeting found for ${track} on ${date}`)
      return null
    }
    console.log(`[TrackerResults] Found meeting ID: ${meeting.meetingId} for ${meeting.track.name}`)

    // Get results for this meeting and race (meetingId is string from API, convert to number)
    const meetingIdNum = parseInt(meeting.meetingId, 10)
    const results = await getMeetingResults(meetingIdNum, raceNumber)
    console.log(`[TrackerResults] API response:`, results)

    if (!results || !results.raceResults) {
      console.warn(`[TrackerResults] No race results in response`)
      return null
    }

    // Find the specific race result
    const raceResult = results.raceResults.find((r) => r.raceNumber === raceNumber)
    console.log(`[TrackerResults] Race result for R${raceNumber}:`, raceResult)

    if (!raceResult || !raceResult.runners || raceResult.runners.length === 0) {
      console.warn(`[TrackerResults] No runners found for R${raceNumber}`)
      return null
    }

    // Extract winner (position 1)
    const winner = raceResult.runners.find((r) => r.position === 1)
    if (!winner) {
      return null
    }

    // Check for dead heat (multiple runners with position 1)
    const deadHeat = raceResult.runners.filter((r) => r.position === 1).length > 1

    // Get scratched runners (runners with position 0 or no position typically indicate scratched)
    // The API may use different indicators, adjust as needed
    const scratched = raceResult.runners
      .filter((r) => r.position === 0 || r.position === 99)
      .map((r) => r.tabNo)

    const result: RaceResultData = {
      winnerName: winner.runner,
      winnerNumber: winner.tabNo,
      position: winner.position,
      margin: winner.margin,
      deadHeat,
      scratched,
      fetchedAt: new Date().toISOString(),
    }

    console.log(`[TrackerResults] Winner: #${result.winnerNumber} ${result.winnerName}`)
    return result
  } catch (error) {
    console.error('fetchRaceResult error:', error)
    throw error
  }
}

/**
 * Check if a race has finished (result available)
 */
export async function isRaceFinished(
  track: string,
  date: string,
  raceNumber: number
): Promise<boolean> {
  try {
    const result = await fetchRaceResult(track, date, raceNumber)
    return result !== null
  } catch {
    return false
  }
}

/**
 * Get meeting ID for a track (cached for efficiency during polling)
 */
const meetingIdCache = new Map<string, { meetingId: number; cachedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getMeetingIdForTrack(
  track: string,
  date: string
): Promise<number | null> {
  const cacheKey = `${track}:${date}`
  const cached = meetingIdCache.get(cacheKey)

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.meetingId
  }

  const meeting = await findMeetingByTrack(track, date)
  if (meeting) {
    const meetingIdNum = parseInt(meeting.meetingId, 10)
    meetingIdCache.set(cacheKey, {
      meetingId: meetingIdNum,
      cachedAt: Date.now(),
    })
    return meetingIdNum
  }

  return null
}

/**
 * Clear meeting ID cache (call when date changes)
 */
export function clearMeetingIdCache(): void {
  meetingIdCache.clear()
}

/**
 * Batch fetch results for multiple tracks
 * More efficient for polling multiple races
 */
export async function fetchResultsForTracks(
  tracksAndRaces: Array<{ track: string; date: string; raceNumber: number }>
): Promise<Map<string, RaceResultData | null>> {
  const results = new Map<string, RaceResultData | null>()

  // Group by track to minimize API calls
  const byTrack = new Map<string, Array<{ date: string; raceNumber: number }>>()
  for (const item of tracksAndRaces) {
    const key = `${item.track}:${item.date}`
    if (!byTrack.has(key)) {
      byTrack.set(key, [])
    }
    byTrack.get(key)!.push({ date: item.date, raceNumber: item.raceNumber })
  }

  // Fetch results for each track
  for (const [key, races] of byTrack.entries()) {
    const [track, date] = key.split(':')
    const meetingId = await getMeetingIdForTrack(track, date)

    if (!meetingId) {
      // Mark all races for this track as null
      for (const race of races) {
        results.set(`${track}:${race.raceNumber}`, null)
      }
      continue
    }

    // Get all results for the meeting
    try {
      const meetingResults = await getMeetingResults(meetingId)
      if (!meetingResults || !meetingResults.raceResults) {
        for (const race of races) {
          results.set(`${track}:${race.raceNumber}`, null)
        }
        continue
      }

      // Map results for each requested race
      for (const race of races) {
        const raceResult = meetingResults.raceResults.find(
          (r) => r.raceNumber === race.raceNumber
        )

        if (!raceResult || !raceResult.runners || raceResult.runners.length === 0) {
          results.set(`${track}:${race.raceNumber}`, null)
          continue
        }

        const winner = raceResult.runners.find((r) => r.position === 1)
        if (!winner) {
          results.set(`${track}:${race.raceNumber}`, null)
          continue
        }

        const deadHeat = raceResult.runners.filter((r) => r.position === 1).length > 1
        const scratched = raceResult.runners
          .filter((r) => r.position === 0 || r.position === 99)
          .map((r) => r.tabNo)

        results.set(`${track}:${race.raceNumber}`, {
          winnerName: winner.runner,
          winnerNumber: winner.tabNo,
          position: winner.position,
          margin: winner.margin,
          deadHeat,
          scratched,
          fetchedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error(`Error fetching results for ${track}:`, error)
      for (const race of races) {
        results.set(`${track}:${race.raceNumber}`, null)
      }
    }
  }

  return results
}
