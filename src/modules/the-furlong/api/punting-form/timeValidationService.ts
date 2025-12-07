/**
 * PuntingForm Time Validation Service
 * Validates Excel race times against PuntingForm API
 */

import { getRaceTimesForTrack } from './resultsService'
import { TIME_VALIDATION_TOLERANCE_MINUTES } from './config'
import type { TimeValidationResult, ValidationSummary } from './types'
import type { RacingPlanEntry } from '../../types'

/**
 * Calculate time difference in minutes between two HH:mm times
 */
function getTimeDifferenceMinutes(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number)
  const [h2, m2] = time2.split(':').map(Number)

  const minutes1 = h1 * 60 + m1
  const minutes2 = h2 * 60 + m2

  return Math.abs(minutes1 - minutes2)
}

/**
 * Validate a single race time against API
 */
function validateRaceTime(
  entry: RacingPlanEntry,
  apiRaceTimes: Map<number, string>
): TimeValidationResult {
  const apiTime = apiRaceTimes.get(entry.raceNumber) || null

  if (!apiTime) {
    return {
      raceNumber: entry.raceNumber,
      track: entry.track,
      excelTime: entry.time,
      apiTime: null,
      isValid: false,
      timeDifferenceMinutes: null,
      status: 'not_found',
      message: `Race ${entry.raceNumber} not found in API for ${entry.track}`,
    }
  }

  const timeDiff = getTimeDifferenceMinutes(entry.time, apiTime)
  const isWithinTolerance = timeDiff <= TIME_VALIDATION_TOLERANCE_MINUTES

  if (timeDiff === 0) {
    return {
      raceNumber: entry.raceNumber,
      track: entry.track,
      excelTime: entry.time,
      apiTime,
      isValid: true,
      timeDifferenceMinutes: 0,
      status: 'verified',
      message: 'Time verified',
    }
  }

  if (isWithinTolerance) {
    return {
      raceNumber: entry.raceNumber,
      track: entry.track,
      excelTime: entry.time,
      apiTime,
      isValid: true,
      timeDifferenceMinutes: timeDiff,
      status: 'verified',
      message: `Time verified (${timeDiff}min difference within tolerance)`,
    }
  }

  return {
    raceNumber: entry.raceNumber,
    track: entry.track,
    excelTime: entry.time,
    apiTime,
    isValid: false,
    timeDifferenceMinutes: timeDiff,
    status: 'mismatch',
    message: `Time mismatch: Excel ${entry.time} vs API ${apiTime} (${timeDiff}min difference)`,
  }
}

/**
 * Validate all race entries against the PuntingForm API
 * Groups entries by track and validates each track's races
 */
export async function validateRaceTimes(
  entries: RacingPlanEntry[],
  date: string
): Promise<{
  validationResults: Map<string, TimeValidationResult>
  summary: ValidationSummary
  correctedEntries: RacingPlanEntry[]
}> {
  const validationResults = new Map<string, TimeValidationResult>()
  const correctedEntries: RacingPlanEntry[] = []

  // Group entries by track
  const entriesByTrack = new Map<string, RacingPlanEntry[]>()
  entries.forEach((entry) => {
    const trackEntries = entriesByTrack.get(entry.track) || []
    trackEntries.push(entry)
    entriesByTrack.set(entry.track, trackEntries)
  })

  // Validate each track's races
  for (const [track, trackEntries] of entriesByTrack) {
    try {
      const apiRaceTimes = await getRaceTimesForTrack(track, date)

      for (const entry of trackEntries) {
        const result = validateRaceTime(entry, apiRaceTimes)
        validationResults.set(entry.id, result)

        // Create corrected entry with API time if available and different
        if (result.apiTime && result.status === 'mismatch') {
          correctedEntries.push({
            ...entry,
            time: result.apiTime,
          })
        } else {
          correctedEntries.push(entry)
        }
      }
    } catch (error) {
      console.error(`Failed to validate times for ${track}:`, error)
      // Mark all entries for this track as pending (API error)
      for (const entry of trackEntries) {
        validationResults.set(entry.id, {
          raceNumber: entry.raceNumber,
          track: entry.track,
          excelTime: entry.time,
          apiTime: null,
          isValid: false,
          timeDifferenceMinutes: null,
          status: 'pending',
          message: `API error: Could not validate ${track}`,
        })
        correctedEntries.push(entry)
      }
    }
  }

  // Calculate summary
  const summary = calculateValidationSummary(validationResults)

  return {
    validationResults,
    summary,
    correctedEntries,
  }
}

/**
 * Calculate validation summary statistics
 */
function calculateValidationSummary(
  results: Map<string, TimeValidationResult>
): ValidationSummary {
  let verified = 0
  let mismatches = 0
  let notFound = 0
  let pending = 0

  results.forEach((result) => {
    switch (result.status) {
      case 'verified':
        verified++
        break
      case 'mismatch':
        mismatches++
        break
      case 'not_found':
        notFound++
        break
      case 'pending':
        pending++
        break
    }
  })

  return {
    totalRaces: results.size,
    verified,
    mismatches,
    notFound,
    pending,
    allValid: mismatches === 0 && notFound === 0 && pending === 0,
  }
}

/**
 * Auto-correct times: Replace Excel times with API times where there's a mismatch
 */
export function applyTimeCorrections(
  entries: RacingPlanEntry[],
  validationResults: Map<string, TimeValidationResult>
): RacingPlanEntry[] {
  return entries.map((entry) => {
    const validation = validationResults.get(entry.id)
    if (validation && validation.apiTime && validation.status === 'mismatch') {
      return {
        ...entry,
        time: validation.apiTime,
      }
    }
    return entry
  })
}
