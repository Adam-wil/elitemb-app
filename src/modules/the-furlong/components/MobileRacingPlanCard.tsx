'use client'

import { Box, Paper, Typography, Checkbox, Chip, Tooltip } from '@mui/material'
import { CheckCircle, AlertTriangle, Clock, HelpCircle, MapPin } from 'lucide-react'
import type { RacingPlanEntry, TimeValidationStatus, BookiePromo, UnitTier } from '../types'
import { UNIT_TIER_CONFIG } from '../types'

interface MobileRacingPlanCardProps {
  entry: RacingPlanEntry
  selectable?: boolean
  isSelected?: boolean
  onSelectChange?: (checked: boolean) => void
  onNormalBookieChange?: (bookies: string[]) => void
  onBetBackBookieChange?: (bookies: string[]) => void
}

// Validation status icon
function ValidationIcon({ status }: { status?: TimeValidationStatus }) {
  switch (status) {
    case 'verified':
      return <CheckCircle size={16} color="#2e7d32" strokeWidth={2.5} />
    case 'mismatch':
      return <AlertTriangle size={16} color="#ed6c02" strokeWidth={2.5} />
    case 'not_found':
      return <HelpCircle size={16} color="#9e9e9e" strokeWidth={2.5} />
    default:
      return <Clock size={16} color="#9e9e9e" strokeWidth={2} />
  }
}

// Bookie chip for mobile - larger touch targets
function MobileBookieChip({
  bookie,
  promo,
  isSelected,
  disabled,
  onClick,
}: {
  bookie: string
  promo: string
  isSelected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  // Get short bookie name
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

  let shortName = bookie.substring(0, 3).toUpperCase()
  for (const [name, abbr] of Object.entries(abbreviations)) {
    if (bookie.toLowerCase().includes(name.toLowerCase())) {
      shortName = abbr
      break
    }
  }

  return (
    <Chip
      label={shortName}
      size="medium"
      onClick={disabled ? undefined : onClick}
      sx={{
        minWidth: 48,
        height: 32,
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        backgroundColor: isSelected ? 'primary.main' : 'success.light',
        color: isSelected ? 'white' : 'success.dark',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.dark' : 'success.main',
        opacity: disabled ? 0.5 : 1,
        '&:hover': disabled ? {} : {
          backgroundColor: isSelected ? 'primary.dark' : 'success.main',
          color: 'white',
        },
        '&:active': disabled ? {} : {
          transform: 'scale(0.95)',
        },
        '& .MuiChip-label': {
          padding: '0 8px',
        },
      }}
    />
  )
}

// Bookie selection section
function BookieSection({
  title,
  promos,
  selectedBookies,
  onSelectionChange,
  maxSelections = 3,
}: {
  title: string
  promos: BookiePromo[]
  selectedBookies: string[]
  onSelectionChange: (bookies: string[]) => void
  maxSelections?: number
}) {
  const availableBookies = promos.filter(bp => Boolean(bp.promo))

  const handleClick = (bookie: string) => {
    const isSelected = selectedBookies.includes(bookie)
    if (isSelected) {
      onSelectionChange(selectedBookies.filter(b => b !== bookie))
    } else if (selectedBookies.length < maxSelections) {
      onSelectionChange([...selectedBookies, bookie])
    }
  }

  if (availableBookies.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}
        >
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
          {selectedBookies.length}/{maxSelections} selected
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {availableBookies.map((bp) => (
          <Tooltip key={bp.bookie} title={`${bp.bookie}: ${bp.promo}`} enterTouchDelay={200}>
            <span>
              <MobileBookieChip
                bookie={bp.bookie}
                promo={bp.promo || ''}
                isSelected={selectedBookies.includes(bp.bookie)}
                disabled={!selectedBookies.includes(bp.bookie) && selectedBookies.length >= maxSelections}
                onClick={() => handleClick(bp.bookie)}
              />
            </span>
          </Tooltip>
        ))}
      </Box>
    </Box>
  )
}

export function MobileRacingPlanCard({
  entry,
  selectable = false,
  isSelected = false,
  onSelectChange,
  onNormalBookieChange,
  onBetBackBookieChange,
}: MobileRacingPlanCardProps) {
  const tierConfig = UNIT_TIER_CONFIG[entry.unitTier || 'neutral']

  // Color mapping for unit tiers
  const tierColors: Record<UnitTier, { bg: string; text: string; border: string }> = {
    green: { bg: '#c8e6c9', text: '#2e7d32', border: '#81c784' },
    neutral: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' },
    pink: { bg: '#f8bbd9', text: '#c2185b', border: '#f48fb1' },
  }
  const colors = tierColors[entry.unitTier || 'neutral']

  const normalPromos = entry.normalPromosByBookie || []
  const betBackPromos = entry.betBackPromosByBookie || []

  return (
    <Paper
      elevation={entry.skip ? 0 : 1}
      sx={{
        p: 1.5,
        mb: 1,
        backgroundColor: entry.skip ? '#fafafa' : '#fff',
        border: '1px solid',
        borderColor: isSelected ? 'primary.main' : entry.skip ? '#e5e7eb' : '#e0e0e0',
        borderRadius: 2,
        opacity: entry.skip ? 0.7 : 1,
      }}
    >
      {/* Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Checkbox */}
        {selectable && (
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            disabled={entry.skip}
            size="small"
            sx={{ p: 0.5, ml: -0.5 }}
          />
        )}

        {/* Time with validation icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {entry.time}
          </Typography>
          <ValidationIcon status={entry.timeValidationStatus} />
        </Box>

        {/* Track */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
          <MapPin size={14} color="#6b7280" />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            {entry.track}
          </Typography>
        </Box>

        {/* Race number */}
        <Box
          sx={{
            backgroundColor: '#f3f4f6',
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
            R{entry.raceNumber}
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Status badges */}
        {entry.skip ? (
          <Chip
            label="SKIP"
            size="small"
            sx={{
              height: 22,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          />
        ) : (
          <Chip
            label={tierConfig.label}
            size="small"
            sx={{
              height: 22,
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          />
        )}
      </Box>

      {/* Bookie Selections - only show if not skipped */}
      {!entry.skip && (
        <>
          {normalPromos.length > 0 && onNormalBookieChange && (
            <BookieSection
              title="Normal Promos"
              promos={normalPromos}
              selectedBookies={entry.selectedNormalBookies || []}
              onSelectionChange={onNormalBookieChange}
              maxSelections={3}
            />
          )}

          {betBackPromos.length > 0 && onBetBackBookieChange && (
            <BookieSection
              title="Bet Back Options"
              promos={betBackPromos}
              selectedBookies={entry.selectedBetBackBookies || []}
              onSelectionChange={onBetBackBookieChange}
              maxSelections={3}
            />
          )}
        </>
      )}
    </Paper>
  )
}
