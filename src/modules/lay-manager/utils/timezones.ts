import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with timezone support
dayjs.extend(utc)
dayjs.extend(timezone)

export interface TimezoneOption {
  id: string
  label: string
  shortLabel: string
  iana: string // IANA timezone identifier
  utcOffset: string // Display offset (note: changes with DST)
}

// Source timezone - race times from Excel/API are in Melbourne time
export const SOURCE_TIMEZONE = 'Australia/Melbourne'

// Supported user timezones - ordered West to East
export const TIMEZONES: TimezoneOption[] = [
  // Asia (UTC+8 to +9)
  {
    id: 'hongkong',
    label: 'Hong Kong (HKT)',
    shortLabel: 'HKG',
    iana: 'Asia/Hong_Kong',
    utcOffset: 'UTC+8',
  },
  {
    id: 'singapore',
    label: 'Singapore (SGT)',
    shortLabel: 'SIN',
    iana: 'Asia/Singapore',
    utcOffset: 'UTC+8',
  },
  {
    id: 'tokyo',
    label: 'Tokyo (JST)',
    shortLabel: 'TYO',
    iana: 'Asia/Tokyo',
    utcOffset: 'UTC+9',
  },
  // Australia - West to East (UTC+8 to +10/11)
  {
    id: 'perth',
    label: 'Perth (AWST)',
    shortLabel: 'PER',
    iana: 'Australia/Perth',
    utcOffset: 'UTC+8',
  },
  {
    id: 'darwin',
    label: 'Darwin (ACST)',
    shortLabel: 'DRW',
    iana: 'Australia/Darwin',
    utcOffset: 'UTC+9:30',
  },
  {
    id: 'adelaide',
    label: 'Adelaide (ACST/ACDT)',
    shortLabel: 'ADL',
    iana: 'Australia/Adelaide',
    utcOffset: 'UTC+9:30/+10:30',
  },
  {
    id: 'brisbane',
    label: 'Brisbane (AEST)',
    shortLabel: 'BNE',
    iana: 'Australia/Brisbane',
    utcOffset: 'UTC+10',
  },
  {
    id: 'sydney',
    label: 'Sydney (AEST/AEDT)',
    shortLabel: 'SYD',
    iana: 'Australia/Sydney',
    utcOffset: 'UTC+10/+11',
  },
  {
    id: 'melbourne',
    label: 'Melbourne (AEST/AEDT)',
    shortLabel: 'MEL',
    iana: 'Australia/Melbourne',
    utcOffset: 'UTC+10/+11',
  },
  // New Zealand (UTC+12/+13)
  {
    id: 'auckland',
    label: 'Auckland (NZST/NZDT)',
    shortLabel: 'AKL',
    iana: 'Pacific/Auckland',
    utcOffset: 'UTC+12/+13',
  },
]

/**
 * Convert a time string from Melbourne timezone to target timezone
 * @param time - Time in HH:MM format (assumed Melbourne time)
 * @param date - The date of the race (needed for DST calculation)
 * @param targetTimezoneId - Target timezone ID from TIMEZONES
 * @returns Converted time in HH:MM format
 */
export function convertRaceTime(
  time: string,
  date: string,
  targetTimezoneId: string
): string {
  if (!time || !date) return time

  const targetTz = TIMEZONES.find((tz) => tz.id === targetTimezoneId)
  if (!targetTz || targetTz.id === 'melbourne') {
    return time // No conversion needed
  }

  try {
    // Parse the time as Melbourne time on the given date
    const melbourneDateTime = dayjs.tz(`${date} ${time}`, SOURCE_TIMEZONE)

    // Convert to target timezone
    const convertedDateTime = melbourneDateTime.tz(targetTz.iana)

    return convertedDateTime.format('HH:mm')
  } catch {
    // Return original time if conversion fails
    return time
  }
}

/**
 * Get the current offset difference between Melbourne and target timezone
 * Useful for displaying "+2hrs" or "-3hrs" indicators
 */
export function getOffsetDifference(
  date: string,
  targetTimezoneId: string
): { hours: number; label: string } {
  const targetTz = TIMEZONES.find((tz) => tz.id === targetTimezoneId)
  if (!targetTz || targetTz.id === 'melbourne') {
    return { hours: 0, label: '' }
  }

  try {
    const melbourneTime = dayjs.tz(date, SOURCE_TIMEZONE)
    const targetTime = dayjs.tz(date, targetTz.iana)

    const melbourneOffset = melbourneTime.utcOffset()
    const targetOffset = targetTime.utcOffset()

    const diffMinutes = targetOffset - melbourneOffset
    const diffHours = diffMinutes / 60

    if (diffHours === 0) {
      return { hours: 0, label: '' }
    }

    const sign = diffHours > 0 ? '+' : ''
    const label = `${sign}${diffHours}hr${Math.abs(diffHours) !== 1 ? 's' : ''}`

    return { hours: diffHours, label }
  } catch {
    return { hours: 0, label: '' }
  }
}

/**
 * Storage key for persisting timezone preference
 */
export const TIMEZONE_STORAGE_KEY = 'elitemb-timezone-preference'

/**
 * Get saved timezone preference or default to Melbourne
 */
export function getSavedTimezone(): string {
  if (typeof window === 'undefined') return 'melbourne'
  return localStorage.getItem(TIMEZONE_STORAGE_KEY) || 'melbourne'
}

/**
 * Save timezone preference
 */
export function saveTimezone(timezoneId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TIMEZONE_STORAGE_KEY, timezoneId)
}
