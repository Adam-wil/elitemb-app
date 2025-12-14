/**
 * PuntingForm Meetings Service
 * Handles API calls for meetings and track data
 * Uses server functions to bypass CORS
 */

import type { PFMeeting } from './types'
import { fetchMeetingsServer } from './server'

/**
 * Get list of meetings for a specific date
 * Uses server function to bypass CORS
 */
export async function getMeetings(
  date: string,
  jurisdiction?: string
): Promise<PFMeeting[]> {
  try {
    console.log(`[MeetingsService] Getting meetings for ${date}`)
    // Server function with inputValidator: caller passes { data: {...} }, handler receives { data: {...} }
    const meetings = await fetchMeetingsServer({ data: { date, jurisdiction } })
    console.log(`[MeetingsService] Found ${Array.isArray(meetings) ? meetings.length : 0} meetings`)
    return meetings || []
  } catch (error) {
    console.error('getMeetings error:', error)
    throw error
  }
}

/**
 * Find meeting by track name and date
 */
export async function findMeetingByTrack(
  trackName: string,
  date: string
): Promise<PFMeeting | null> {
  console.log(`[findMeetingByTrack] Searching for track: "${trackName}" on date: ${date}`)

  const meetings = await getMeetings(date)

  if (meetings.length === 0) {
    console.warn(`[findMeetingByTrack] No meetings found for date ${date}. API may not have data for this date yet.`)
    return null
  }

  console.log(`[findMeetingByTrack] Found ${meetings.length} meetings for ${date}:`)
  meetings.forEach((m, idx) => {
    console.log(`  ${idx + 1}. ${m.track?.name || 'UNKNOWN'} (ID: ${m.meetingId}, State: ${m.track?.state || 'N/A'})`)
  })

  const normalizedTrack = trackName.toLowerCase().trim()
  console.log(`[findMeetingByTrack] Normalized search term: "${normalizedTrack}"`)

  const meeting = meetings.find((m) => {
    // Skip meetings with undefined or null track.name
    if (!m.track?.name) return false
    const apiTrackName = m.track.name.toLowerCase().trim()
    const matches = apiTrackName.includes(normalizedTrack) || normalizedTrack.includes(apiTrackName)

    if (matches) {
      console.log(`[findMeetingByTrack] ✓ MATCH FOUND: "${trackName}" matches "${m.track.name}"`)
    }

    return matches
  })

  if (!meeting) {
    console.warn(`[findMeetingByTrack] ✗ NO MATCH: "${trackName}" not found in any meeting names`)
    console.warn(`[findMeetingByTrack] Available tracks: ${meetings.map(m => m.track?.name).filter(Boolean).join(', ')}`)
  }

  return meeting || null
}
