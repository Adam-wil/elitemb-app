import * as XLSX from 'xlsx'
import type { RacingPlanEntry, BookiePromo, BookieList, UnitTier } from '../types'
import { KNOWN_TRACKS } from '../types'

export interface ParseResult {
  entries: RacingPlanEntry[]
  detectedDate: string | null
  fileName: string
  betBackColumnDetected: boolean
  detectedBetBackColumn: string | null
  bookieList: BookieList
}

export interface ParseOptions {
  betBackColumn?: string // e.g., "U" - user-specified column where Bet Back starts
}

/**
 * Converts Excel time decimal to HH:MM format
 * Excel stores time as a decimal (0.5 = 12:00, 0.75 = 18:00)
 */
function excelTimeToString(timeDecimal: number): string {
  const totalMinutes = Math.round(timeDecimal * 24 * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Check if a value is a known track name
 */
function isTrackName(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const upperValue = value.toUpperCase().trim()
  return KNOWN_TRACKS.some(track => upperValue === track || upperValue.includes(track))
}

/**
 * Find the column index where track names start (columns A-F, indices 0-5)
 */
function findTrackColumn(worksheet: XLSX.WorkSheet, range: XLSX.Range): number {
  console.log('findTrackColumn: searching for track names in first 10 rows, columns A-F')
  // Search first 10 rows for track names in columns A-F
  for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
    for (let col = 0; col <= 5; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v) {
        const value = String(cell.v).trim()
        console.log(`  Row ${row}, Col ${columnIndexToLetter(col)}: "${value}" - isTrack: ${isTrackName(cell.v)}`)
        if (isTrackName(cell.v)) {
          console.log(`  Found track column at ${columnIndexToLetter(col)}`)
          return col
        }
      }
    }
  }
  return -1
}

/**
 * Values to exclude from bookie detection (section headers, metadata columns, etc.)
 */
const EXCLUDED_VALUES = [
  'NORMAL PROMO', 'NORMAL PROMOS', 'BET BACK', 'BETBACK', 'BET BACK OPTIONS',
  'SKIP', 'TRACK', 'RACE', 'TIME', 'STATUS', 'OPTIONS', 'PROMO', 'PROMOS'
]

/**
 * Check if a value should be excluded from bookie list
 */
function isExcludedValue(value: string): boolean {
  const upper = value.toUpperCase().trim()
  return EXCLUDED_VALUES.some(excluded => upper === excluded || upper.includes(excluded))
}

/**
 * Extract bookie names from header row
 * Returns array of bookie names for columns in range, plus the row where they were found
 * Searches multiple rows to find the one with the most column headers
 * Includes ALL column headers except excluded values (section headers, etc.)
 */
function extractBookieHeaders(
  worksheet: XLSX.WorkSheet,
  startCol: number,
  endCol: number,
  searchStartRow: number
): { bookies: { col: number; bookie: string }[]; headerRow: number } {
  console.log(`extractBookieHeaders: searching cols ${columnIndexToLetter(startCol)} to ${columnIndexToLetter(endCol)}, starting from row ${searchStartRow}`)

  let bestRow = -1
  let bestBookies: { col: number; bookie: string }[] = []

  // Search rows 0 to searchStartRow+2 to find the row with the most bookie names
  for (let row = 0; row <= searchStartRow + 2; row++) {
    const rowBookies: { col: number; bookie: string }[] = []
    const seenBookies = new Set<string>() // Track seen bookie names to avoid duplicates

    for (let col = startCol; col <= endCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      if (cell && cell.v) {
        const value = String(cell.v).trim()
        const upperValue = value.toUpperCase()

        // Skip excluded values (section headers, etc.) and track names
        if (value && !isExcludedValue(value) && !isTrackName(value)) {
          // Only add if we haven't seen this bookie name before (case-insensitive)
          if (!seenBookies.has(upperValue)) {
            seenBookies.add(upperValue)
            rowBookies.push({ col, bookie: value })
            console.log(`  Row ${row}, Col ${columnIndexToLetter(col)}: "${value}"`)
          } else {
            console.log(`  Row ${row}, Col ${columnIndexToLetter(col)}: "${value}" (DUPLICATE - skipping)`)
          }
        }
      }
    }

    // Keep track of the row with the most bookies found
    if (rowBookies.length > bestBookies.length) {
      bestBookies = rowBookies
      bestRow = row
    }
  }

  if (bestBookies.length >= 2) {
    console.log(`Found ${bestBookies.length} unique bookies in row ${bestRow}:`, bestBookies.map(b => `${b.bookie}@${columnIndexToLetter(b.col)}`))
    return { bookies: bestBookies, headerRow: bestRow }
  }

  return { bookies: [], headerRow: searchStartRow }
}

/**
 * Find column headers to determine section boundaries
 * Returns { normalPromosStart, betBackStart, endCol, headerRow }
 */
function findSectionColumns(worksheet: XLSX.WorkSheet, range: XLSX.Range): {
  normalPromosStart: number
  betBackStart: number | null
  endCol: number
  headerRow: number
} {
  let normalPromosStart = -1
  let betBackStart: number | null = null
  let headerRow = 0

  console.log(`findSectionColumns: searching rows 0-2, cols 0 to ${columnIndexToLetter(range.e.c)}`)

  // Search header rows (typically row 1-2) for section headers
  for (let row = 0; row <= 2; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = worksheet[cellAddress]
      if (cell && typeof cell.v === 'string') {
        const value = cell.v.toUpperCase().trim()
        if (value.includes('NORMAL PROMO')) {
          normalPromosStart = col
          headerRow = row
          console.log(`  Found "NORMAL PROMO" at row ${row}, col ${columnIndexToLetter(col)}`)
        } else if (value.includes('BET BACK') || value.includes('BETBACK')) {
          betBackStart = col
          console.log(`  Found "BET BACK" at row ${row}, col ${columnIndexToLetter(col)}`)
        }
      }
    }
  }

  console.log(`Section columns: normalPromosStart=${normalPromosStart >= 0 ? columnIndexToLetter(normalPromosStart) : 'N/A'}, betBackStart=${betBackStart !== null ? columnIndexToLetter(betBackStart) : 'N/A'}, endCol=${columnIndexToLetter(range.e.c)}`)

  return {
    normalPromosStart,
    betBackStart,
    endCol: range.e.c,
    headerRow,
  }
}

/**
 * Try to extract date from filename
 * Handles formats like: PromoList6thDec25.xlsx, PromoList29thNov25.xlsx
 */
function extractDateFromFilename(filename: string): string | null {
  // Remove extension
  const baseName = filename.replace(/\.[^/.]+$/, '')

  // Pattern: day + ordinal + month + year (e.g., 6thDec25, 29thNov25)
  const datePattern = /(\d{1,2})(?:st|nd|rd|th)?[\s-]?([A-Za-z]{3,})[\s-]?(\d{2,4})/i
  const match = baseName.match(datePattern)

  if (match) {
    const day = match[1].padStart(2, '0')
    const monthStr = match[2].toLowerCase()
    const year = match[3].length === 2 ? `20${match[3]}` : match[3]

    const months: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12',
    }

    const month = months[monthStr.substring(0, 3)]
    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  return null
}

/**
 * Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
 */
function columnLetterToIndex(letter: string): number {
  return XLSX.utils.decode_col(letter.toUpperCase())
}

/**
 * Convert column index to letter (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
 */
function columnIndexToLetter(index: number): string {
  return XLSX.utils.encode_col(index)
}

/**
 * Calculate color distance between two RGB colors using Euclidean distance
 * Lower values = more similar colors
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  )
}

/**
 * Reference colors for unit tier detection
 * Each tier can have multiple reference colors to match against
 */
const UNIT_TIER_COLORS = {
  green: [
    // Bright greens (1U MAX tier)
    { r: 0, g: 250, b: 0 },      // Bright green from Excel
    { r: 0, g: 255, b: 0 },      // Pure green
    { r: 146, g: 208, b: 80 },   // Excel green #92D050
    { r: 0, g: 176, b: 80 },     // Dark green #00B050
    { r: 39, g: 209, b: 125 },   // Teal green from Excel
    { r: 4, g: 133, b: 66 },     // Dark forest green
    { r: 21, g: 122, b: 68 },    // Another dark green
  ],
  pink: [
    // Magenta/Pink colors (3U tier)
    { r: 255, g: 64, b: 255 },   // Bright magenta from Excel
    { r: 255, g: 0, b: 255 },    // Pure magenta
    { r: 255, g: 105, b: 180 },  // Hot pink
    { r: 255, g: 192, b: 203 },  // Light pink
    { r: 255, g: 153, b: 204 },  // Pink #FF99CC
    // Yellow colors (also 3U tier based on user's Excel)
    { r: 255, g: 255, b: 0 },    // Pure yellow
    { r: 255, g: 212, b: 14 },   // Gold yellow from Excel
    { r: 242, g: 194, b: 49 },   // Another yellow from Excel
    // Purple colors (also 3U tier)
    { r: 112, g: 48, b: 160 },   // Purple from Excel
    { r: 119, g: 43, b: 144 },   // Another purple
    { r: 81, g: 45, b: 109 },    // Dark purple
  ],
}

// Maximum color distance to consider a match (0-441 range, where 441 is black to white)
const COLOR_MATCH_THRESHOLD = 80

/**
 * Determine unit tier from RGB color values using color similarity matching
 * Green background = 1U MAX, Pink/Yellow/Magenta background = 3U potential, No color = Standard
 */
function getUnitTierFromRgb(r: number, g: number, b: number): UnitTier {
  console.log(`  Checking color: RGB(${r}, ${g}, ${b})`)

  // Skip very dark colors (likely black text or borders) and very light colors (white/near-white)
  const brightness = (r + g + b) / 3
  if (brightness < 30 || brightness > 245) {
    console.log(`    -> Skipping (brightness: ${brightness.toFixed(0)})`)
    return 'neutral'
  }

  // Check against green reference colors
  for (const ref of UNIT_TIER_COLORS.green) {
    const distance = colorDistance(r, g, b, ref.r, ref.g, ref.b)
    if (distance < COLOR_MATCH_THRESHOLD) {
      console.log(`    -> Detected GREEN (1U MAX) - distance: ${distance.toFixed(1)} to RGB(${ref.r},${ref.g},${ref.b})`)
      return 'green'
    }
  }

  // Check against pink/yellow/magenta reference colors
  for (const ref of UNIT_TIER_COLORS.pink) {
    const distance = colorDistance(r, g, b, ref.r, ref.g, ref.b)
    if (distance < COLOR_MATCH_THRESHOLD) {
      console.log(`    -> Detected PINK/3U - distance: ${distance.toFixed(1)} to RGB(${ref.r},${ref.g},${ref.b})`)
      return 'pink'
    }
  }

  // Fallback heuristics for colors not in reference list
  // Detect any bright green-ish color
  if (g > 150 && g > r * 1.2 && g > b * 1.2) {
    console.log('    -> Detected GREEN (heuristic)')
    return 'green'
  }

  // Detect any magenta/pink-ish color (high red + high blue, low green)
  if (r > 180 && b > 180 && g < 150) {
    console.log('    -> Detected MAGENTA (heuristic)')
    return 'pink'
  }

  // Detect any yellow-ish color (high red + high green, low blue)
  if (r > 200 && g > 180 && b < 100) {
    console.log('    -> Detected YELLOW (heuristic)')
    return 'pink'
  }

  return 'neutral'
}

/**
 * Parse styles.xml from xlsx to extract fill colors
 * Returns a map of style index to RGB color string
 */
async function parseStylesFromXlsx(file: File): Promise<Map<number, { r: number; g: number; b: number }>> {
  const colorMap = new Map<number, { r: number; g: number; b: number }>()

  try {
    const JSZip = (await import('jszip')).default
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Parse styles.xml
    const stylesXml = await zip.file('xl/styles.xml')?.async('string')
    if (!stylesXml) {
      console.log('No styles.xml found in xlsx')
      return colorMap
    }

    // Parse the XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(stylesXml, 'text/xml')

    // Extract fills (background colors)
    const fills: { r: number; g: number; b: number }[] = []
    const fillElements = doc.querySelectorAll('fill')
    fillElements.forEach((fill, index) => {
      const fgColor = fill.querySelector('fgColor')
      if (fgColor) {
        const rgb = fgColor.getAttribute('rgb')
        if (rgb && rgb.length >= 6) {
          // RGB format is AARRGGBB or RRGGBB
          const hex = rgb.length === 8 ? rgb.substring(2) : rgb
          const r = parseInt(hex.substring(0, 2), 16)
          const g = parseInt(hex.substring(2, 4), 16)
          const b = parseInt(hex.substring(4, 6), 16)
          fills[index] = { r, g, b }
          console.log(`Fill ${index}: RGB(${r}, ${g}, ${b}) from ${rgb}`)
        }
      }
    })

    // Extract cellXfs (cell format records) which map to fills
    const cellXfs = doc.querySelectorAll('cellXfs xf')
    cellXfs.forEach((xf, styleIndex) => {
      const fillId = parseInt(xf.getAttribute('fillId') || '0', 10)
      if (fills[fillId]) {
        colorMap.set(styleIndex, fills[fillId])
        console.log(`Style ${styleIndex} -> Fill ${fillId}: RGB(${fills[fillId].r}, ${fills[fillId].g}, ${fills[fillId].b})`)
      }
    })

    console.log(`Parsed ${colorMap.size} styles with colors`)
  } catch (err) {
    console.error('Error parsing styles from xlsx:', err)
  }

  return colorMap
}

/**
 * Parse sheet1.xml to get cell style indices
 * Returns a map of cell address to style index
 */
async function parseCellStylesFromXlsx(file: File): Promise<Map<string, number>> {
  const cellStyles = new Map<string, number>()

  try {
    const JSZip = (await import('jszip')).default
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Parse sheet1.xml (or first sheet)
    let sheetXml: string | undefined
    const sheetFile = zip.file('xl/worksheets/sheet1.xml')
    if (sheetFile) {
      sheetXml = await sheetFile.async('string')
    }

    if (!sheetXml) {
      console.log('No sheet1.xml found in xlsx')
      return cellStyles
    }

    // Parse the XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(sheetXml, 'text/xml')

    // Extract cell style indices
    const cells = doc.querySelectorAll('c')
    cells.forEach((cell) => {
      const ref = cell.getAttribute('r') // Cell reference like "A1", "B2"
      const style = cell.getAttribute('s') // Style index
      if (ref && style) {
        cellStyles.set(ref, parseInt(style, 10))
      }
    })

    console.log(`Parsed ${cellStyles.size} cells with styles`)
  } catch (err) {
    console.error('Error parsing cell styles from xlsx:', err)
  }

  return cellStyles
}

/**
 * Get unit tier for a specific cell based on its style
 */
function getUnitTierFromCellStyle(
  cellRef: string,
  cellStyles: Map<string, number>,
  styleColors: Map<number, { r: number; g: number; b: number }>
): UnitTier {
  const styleIndex = cellStyles.get(cellRef)
  if (styleIndex === undefined) return 'neutral'

  const color = styleColors.get(styleIndex)
  if (!color) return 'neutral'

  return getUnitTierFromRgb(color.r, color.g, color.b)
}

export async function parseRacingPlanExcel(file: File, options?: ParseOptions): Promise<ParseResult> {
  // First, parse cell styles from the xlsx file to get background colors
  console.log('Parsing cell styles for unit tier detection...')
  const [styleColors, cellStyles] = await Promise.all([
    parseStylesFromXlsx(file),
    parseCellStylesFromXlsx(file),
  ])
  console.log(`Found ${styleColors.size} style colors and ${cellStyles.size} cell styles`)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Extract date from filename
        const detectedDate = extractDateFromFilename(file.name)

        if (!worksheet['!ref']) {
          resolve({
            entries: [],
            detectedDate,
            fileName: file.name,
            betBackColumnDetected: false,
            detectedBetBackColumn: null,
            bookieList: { normalPromoBookies: [], betBackBookies: [] },
          })
          return
        }

        const range = XLSX.utils.decode_range(worksheet['!ref'])
        const trackCol = findTrackColumn(worksheet, range)

        if (trackCol === -1) {
          reject(new Error('Could not find track names in columns A-F'))
          return
        }

        // Find section boundaries from headers
        const sections = findSectionColumns(worksheet, range)

        // Use user-specified bet back column if provided, otherwise use detected
        let betBackStartCol: number | null = null
        let betBackColumnDetected = false
        let detectedBetBackColumn: string | null = null

        if (options?.betBackColumn) {
          // User specified the column
          betBackStartCol = columnLetterToIndex(options.betBackColumn)
          detectedBetBackColumn = options.betBackColumn.toUpperCase()
        } else if (sections.betBackStart !== null) {
          // Auto-detected from header
          betBackStartCol = sections.betBackStart
          betBackColumnDetected = true
          detectedBetBackColumn = columnIndexToLetter(sections.betBackStart)
        }

        // Determine promo column ranges
        // Normal promos: from first promo column to bet back start (or end)
        const normalPromosStartCol = trackCol + 3 // After track, race, time
        const normalPromosEndCol = betBackStartCol ? betBackStartCol - 1 : range.e.c
        // For bet back, skip the first column if it contains the "Bet Back" header
        const betBackBookiesStartCol = betBackStartCol !== null ? betBackStartCol + 1 : null
        const betBackEndCol = range.e.c

        console.log(`Column ranges:`)
        console.log(`  Track col: ${columnIndexToLetter(trackCol)}`)
        console.log(`  Normal Promos: ${columnIndexToLetter(normalPromosStartCol)} to ${columnIndexToLetter(normalPromosEndCol)}`)
        if (betBackBookiesStartCol !== null) {
          console.log(`  Bet Back: ${columnIndexToLetter(betBackBookiesStartCol)} to ${columnIndexToLetter(betBackEndCol)}`)
        }

        // Extract bookie names from headers
        // Look for bookie headers in the row after section headers (or same row)
        console.log(`\nExtracting Normal Promo bookies:`)
        const normalPromoResult = extractBookieHeaders(
          worksheet,
          normalPromosStartCol,
          normalPromosEndCol,
          sections.headerRow
        )
        const normalPromoBookies = normalPromoResult.bookies

        console.log(`\nExtracting Bet Back bookies:`)
        const betBackResult = betBackBookiesStartCol !== null
          ? extractBookieHeaders(worksheet, betBackBookiesStartCol, betBackEndCol, sections.headerRow)
          : { bookies: [], headerRow: sections.headerRow }
        const betBackBookies = betBackResult.bookies

        // Create bookie list for return
        const bookieList: BookieList = {
          normalPromoBookies: normalPromoBookies.map(b => b.bookie),
          betBackBookies: betBackBookies.map(b => b.bookie),
        }

        const entries: RacingPlanEntry[] = []

        // Find the first row that has a track name in the track column
        // This is the actual data start row (not based on header detection)
        let dataStartRow = 2 // Start searching from row 2 (0-indexed, so row 3 in Excel)
        for (let row = 0; row <= 10; row++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: trackCol })]
          if (cell && isTrackName(cell.v)) {
            dataStartRow = row
            break
          }
        }
        console.log(`Data starts at row ${dataStartRow}, total rows: ${range.e.r}`)
        console.log(`Track column: ${columnIndexToLetter(trackCol)}`)

        for (let row = dataStartRow; row <= range.e.r; row++) {
          const trackCell = worksheet[XLSX.utils.encode_cell({ r: row, c: trackCol })]

          if (!trackCell || !isTrackName(trackCell.v)) {
            if (trackCell && trackCell.v) {
              console.log(`  Row ${row}: "${trackCell.v}" - not a track, skipping`)
            }
            continue
          }

          const track = String(trackCell.v).toUpperCase().trim()

          // Race number is next column
          const raceCell = worksheet[XLSX.utils.encode_cell({ r: row, c: trackCol + 1 })]
          const raceNumber = raceCell ? Number(raceCell.v) : 0

          // Time is next column after race number
          const timeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: trackCol + 2 })]

          console.log(`  Row ${row}: Track="${track}", Race=${raceNumber}, TimeCell=${timeCell?.v}`)
          let time = ''
          if (timeCell) {
            if (typeof timeCell.v === 'number') {
              time = excelTimeToString(timeCell.v)
            } else {
              time = String(timeCell.v)
            }
          }

          // Determine unit tier from cell background color (check Race and Time columns)
          // Green = 1U MAX, Pink = 3U potential, Neutral = standard
          const raceCellRef = XLSX.utils.encode_cell({ r: row, c: trackCol + 1 })
          const timeCellRef = XLSX.utils.encode_cell({ r: row, c: trackCol + 2 })
          console.log(`  Checking unit tier for cells: Race=${raceCellRef}, Time=${timeCellRef}`)

          const raceCellUnitTier = getUnitTierFromCellStyle(raceCellRef, cellStyles, styleColors)
          const timeCellUnitTier = getUnitTierFromCellStyle(timeCellRef, cellStyles, styleColors)

          // Use the most "aggressive" tier (pink > green > neutral)
          let unitTier: UnitTier = 'neutral'
          if (raceCellUnitTier === 'pink' || timeCellUnitTier === 'pink') {
            unitTier = 'pink'
          } else if (raceCellUnitTier === 'green' || timeCellUnitTier === 'green') {
            unitTier = 'green'
          }
          console.log(`  Unit tier: ${unitTier} (race: ${raceCellUnitTier}, time: ${timeCellUnitTier})`)

          // Collect Normal Promos (legacy format)
          const normalPromos: string[] = []
          const normalPromosByBookie: BookiePromo[] = []
          let skip = false

          // Scan the Normal Promos section for bookie names
          // Each cell contains the name of a bookie that has a promo for this race
          const seenNormalBookies = new Set<string>()
          for (let col = normalPromosStartCol; col <= normalPromosEndCol; col++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
            if (cell && cell.v) {
              const cellValue = String(cell.v).trim().replace(/\n/g, ' ')
              const upperValue = cellValue.toUpperCase()
              if (upperValue === 'SKIP') {
                skip = true
              } else if (cellValue && !isExcludedValue(cellValue) && !seenNormalBookies.has(upperValue)) {
                // This cell contains a bookie name that has a promo (deduplicated)
                seenNormalBookies.add(upperValue)
                normalPromosByBookie.push({
                  bookie: cellValue,
                  promo: 'Available',
                  selected: false,
                })
                normalPromos.push(cellValue)
              }
            }
          }

          // Scan the Bet Back section for bookie names
          const betBackPromos: string[] = []
          const betBackPromosByBookie: BookiePromo[] = []

          if (betBackStartCol !== null) {
            const seenBetBackBookies = new Set<string>()
            for (let col = betBackStartCol; col <= betBackEndCol; col++) {
              const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
              if (cell && cell.v) {
                const cellValue = String(cell.v).trim().replace(/\n/g, ' ')
                const upperValue = cellValue.toUpperCase()
                if (cellValue && !isExcludedValue(cellValue) && !seenBetBackBookies.has(upperValue)) {
                  // This cell contains a bookie name that has a bet back option (deduplicated)
                  seenBetBackBookies.add(upperValue)
                  betBackPromosByBookie.push({
                    bookie: cellValue,
                    promo: 'Available',
                    selected: false,
                  })
                  betBackPromos.push(cellValue)
                }
              }
            }
          }

          // Create unique ID based on track, race number, and time
          const entryId = `${track}-R${raceNumber}-${time.replace(':', '')}`

          // Skip if we already have this entry (prevent duplicates)
          if (entries.some(e => e.id === entryId)) {
            console.log(`Skipping duplicate entry: ${entryId}`)
            continue
          }

          entries.push({
            id: entryId,
            track,
            raceNumber,
            time,
            normalPromos,
            betBackPromos,
            normalPromosByBookie,
            betBackPromosByBookie,
            selectedNormalBookies: [],
            selectedBetBackBookies: [],
            skip,
            unitTier,
          })
        }

        // Sort by time
        entries.sort((a, b) => a.time.localeCompare(b.time))

        resolve({
          entries,
          detectedDate,
          fileName: file.name,
          betBackColumnDetected,
          detectedBetBackColumn,
          bookieList,
        })
      } catch (error) {
        reject(new Error('Failed to parse Excel file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}
