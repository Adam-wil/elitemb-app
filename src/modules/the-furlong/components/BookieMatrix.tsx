'use client'

import { Box, Chip, Tooltip, Typography } from '@mui/material'
import type { BookiePromo } from '../types'

interface BookieMatrixProps {
  promosByBookie: BookiePromo[]
  selectedBookies: string[]
  onSelectionChange: (bookies: string[]) => void
  maxSelections?: number
  compact?: boolean
}

/**
 * Matrix display for bookies with their promos
 * Allows selection of up to maxSelections bookies
 */
export function BookieMatrix({
  promosByBookie,
  selectedBookies,
  onSelectionChange,
  maxSelections = 3,
  compact = false,
}: BookieMatrixProps) {
  const handleBookieClick = (bookie: string, hasPromo: boolean) => {
    if (!hasPromo) return // Can't select bookies without promos

    const isSelected = selectedBookies.includes(bookie)

    if (isSelected) {
      // Deselect
      onSelectionChange(selectedBookies.filter((b) => b !== bookie))
    } else if (selectedBookies.length < maxSelections) {
      // Select if under limit
      onSelectionChange([...selectedBookies, bookie])
    }
  }

  // Get short bookie name (first 3 chars or abbreviation)
  const getShortName = (bookie: string): string => {
    const abbreviations: Record<string, string> = {
      'Sportsbet': 'SB',
      'Ladbrokes': 'LAD',
      'PointsBet': 'PB',
      'TABTOUCH': 'TABT',
      'TAB': 'TAB',
      'Neds': 'NED',
      'Unibet': 'UNI',
      'bet365': '365',
      'BlueBet': 'BB',
      'BetRight': 'BR',
      'Betr': 'BTR',
      'PlayUp': 'PU',
      'TopSport': 'TS',
    }

    // Check for known abbreviations (case insensitive)
    for (const [name, abbr] of Object.entries(abbreviations)) {
      if (bookie.toLowerCase().includes(name.toLowerCase())) {
        return abbr
      }
    }

    // Default to first 3 characters
    return bookie.substring(0, 3).toUpperCase()
  }

  // Filter to only show bookies with promos available
  const availableBookies = promosByBookie.filter(bp => Boolean(bp.promo))

  if (availableBookies.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
        -
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        flexWrap: 'nowrap',
        alignItems: 'center',
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          height: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 2,
        },
      }}
    >
      {availableBookies.map((bp) => {
        const isSelected = selectedBookies.includes(bp.bookie)
        const shortName = getShortName(bp.bookie)

        return (
          <Tooltip
            key={bp.bookie}
            title={`${bp.bookie}: ${bp.promo}`}
            arrow
            placement="top"
          >
            <Chip
              label={shortName}
              size="small"
              onClick={() => handleBookieClick(bp.bookie, true)}
              sx={{
                minWidth: compact ? 32 : 40,
                height: compact ? 20 : 24,
                fontSize: compact ? '0.65rem' : '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isSelected ? 'primary.main' : 'success.light',
                color: isSelected ? 'white' : 'success.dark',
                border: isSelected ? '2px solid' : '1px solid',
                borderColor: isSelected ? 'primary.dark' : 'success.main',
                '&:hover': {
                  backgroundColor: isSelected ? 'primary.dark' : 'success.main',
                  color: 'white',
                },
                '& .MuiChip-label': {
                  padding: compact ? '0 4px' : '0 6px',
                },
              }}
            />
          </Tooltip>
        )
      })}
      {selectedBookies.length > 0 && (
        <Box
          sx={{
            ml: 0.5,
            fontSize: '0.65rem',
            color: 'text.secondary',
          }}
        >
          ({selectedBookies.length}/{maxSelections})
        </Box>
      )}
    </Box>
  )
}
