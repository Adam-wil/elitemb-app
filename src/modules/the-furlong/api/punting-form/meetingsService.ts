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
  const meetings = await getMeetings(date)

  const normalizedTrack = trackName.toLowerCase().trim()
  const meeting = meetings.find((m) => {
    // Skip meetings with undefined or null track.name
    if (!m.track?.name) return false
    const apiTrackName = m.track.name.toLowerCase().trim()
    return (
      apiTrackName.includes(normalizedTrack) ||
      normalizedTrack.includes(apiTrackName)
    )
  })

  return meeting || null
}
