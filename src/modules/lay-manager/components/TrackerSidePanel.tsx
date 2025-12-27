'use client'

import { useState } from 'react'
import { Box, Paper, IconButton, Typography, Tooltip, Switch, TextField, InputAdornment, ToggleButtonGroup, ToggleButton, Divider } from '@mui/material'
import { ChevronLeft, ChevronRight, Columns, Percent, Calculator } from 'lucide-react'

// Column visibility configuration
export interface ColumnVisibility {
  id: string
  label: string
  visible: boolean
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility[] = [
  { id: 'time', label: 'Time', visible: true },
  { id: 'track', label: 'Track', visible: true },
  { id: 'raceNumber', label: 'Race', visible: true },
  { id: 'unitTier', label: 'Units', visible: true },
  { id: 'selectionNumber', label: '#', visible: true },
  { id: 'selectionName', label: 'Selection', visible: true },
  { id: 'bookie', label: 'Bookie', visible: true },
  { id: 'backStake', label: 'Back $', visible: true },
  { id: 'backOdds', label: 'Back Odds', visible: true },
  { id: 'layStake', label: 'Lay $', visible: true },
  { id: 'layOdds', label: 'Lay Odds', visible: true },
  { id: 'layCommission', label: 'Comm%', visible: true },
  { id: 'autoResult', label: 'Result', visible: true },
  { id: 'outcome', label: 'Outcome', visible: true },
  { id: 'actions', label: 'Actions', visible: true },
]

// Australian state commission rates
export interface StateCommission {
  id: string
  label: string
  shortLabel: string
  rate: number
}

/**
 * Default Betfair commission rates by state/territory (HORSES ONLY).
 *
 * DEVELOPERS: Update these rates when Betfair changes their commission structure.
 * Rates are based on Point of Consumption (POC) tax which varies by jurisdiction.
 * These rates apply to horse racing markets only - other sports may differ.
 * Check Betfair's official commission page for current rates.
 * Last updated: December 2024
 */
export const DEFAULT_STATE_COMMISSIONS: StateCommission[] = [
  { id: 'act', label: 'Australian Capital Territory', shortLabel: 'ACT', rate: 10 },
  { id: 'nsw', label: 'New South Wales', shortLabel: 'NSW', rate: 10 },
  { id: 'nt', label: 'Northern Territory', shortLabel: 'NT', rate: 8 },
  { id: 'nz', label: 'New Zealand', shortLabel: 'NZ', rate: 6 },
  { id: 'qld', label: 'Queensland', shortLabel: 'QLD', rate: 8 },
  { id: 'sa', label: 'South Australia', shortLabel: 'SA', rate: 8 },
  { id: 'tas', label: 'Tasmania', shortLabel: 'TAS', rate: 8 },
  { id: 'vic', label: 'Victoria', shortLabel: 'VIC', rate: 8 },
  { id: 'wa', label: 'Western Australia', shortLabel: 'WA', rate: 8 },
  { id: 'int', label: 'International', shortLabel: 'INT', rate: 6 },
]

type TabId = 'columns' | 'commission' | 'calculator'

// Calculator types
type CalculatorMode = 'normal' | 'bonus'

interface CalculatorInputs {
  betStake: string
  backOdds: string
  layOdds: string
  commission: string
}

interface CalculatorResults {
  layStake: number
  liability: number
  profitIfWins: number
  profitIfLoses: number
  bonusPercentage?: number
}

// Calculator functions
function calculateNormalLayStake(betStake: number, backOdds: number, layOdds: number, commission: number): number {
  if (!betStake || betStake === 0 || (layOdds - commission / 100) === 0) {
    return 0
  }
  return (betStake * backOdds) / (layOdds - commission / 100)
}

function calculateBonusLayStake(betStake: number, backOdds: number, layOdds: number, commission: number): number {
  if (!betStake || betStake === 0 || (layOdds - commission / 100) === 0) {
    return 0
  }
  return (betStake * (backOdds - 1)) / (layOdds - commission / 100)
}

function calculateLiability(layStake: number, layOdds: number): number {
  return layStake * (layOdds - 1)
}

function calculateResults(inputs: CalculatorInputs, mode: CalculatorMode): CalculatorResults | null {
  const betStake = parseFloat(inputs.betStake) || 0
  const backOdds = parseFloat(inputs.backOdds) || 0
  const layOdds = parseFloat(inputs.layOdds) || 0
  const commission = parseFloat(inputs.commission) || 0

  if (betStake <= 0 || backOdds <= 1 || layOdds <= 1) {
    return null
  }

  const layStake = mode === 'normal'
    ? calculateNormalLayStake(betStake, backOdds, layOdds, commission)
    : calculateBonusLayStake(betStake, backOdds, layOdds, commission)

  const liability = calculateLiability(layStake, layOdds)

  let profitIfWins: number
  let profitIfLoses: number
  let bonusPercentage: number | undefined

  if (mode === 'normal') {
    // Normal: If wins, get bookmaker profit minus liability
    const bookmakerProfit = betStake * (backOdds - 1)
    profitIfWins = bookmakerProfit - liability
    // If loses, lose stake but win lay bet (minus commission)
    const betfairProfit = layStake * (1 - commission / 100)
    profitIfLoses = -betStake + betfairProfit
  } else {
    // Bonus SNR: If wins, get profit (no stake returned) minus liability
    const bookmakerProfit = betStake * (backOdds - 1)
    profitIfWins = bookmakerProfit - liability
    // If loses, lose nothing (free bet) but win lay bet
    const betfairProfit = layStake * (1 - commission / 100)
    profitIfLoses = betfairProfit
    bonusPercentage = (profitIfLoses / betStake) * 100
  }

  return {
    layStake,
    liability,
    profitIfWins,
    profitIfLoses,
    bonusPercentage,
  }
}

interface TrackerSidePanelProps {
  expanded: boolean
  onToggleExpand: () => void
  columnVisibility: ColumnVisibility[]
  onToggleColumn: (columnId: string) => void
  stateCommissions?: StateCommission[]
  onUpdateStateCommission?: (stateId: string, rate: number) => void
}

export function TrackerSidePanel({
  expanded,
  onToggleExpand,
  columnVisibility,
  onToggleColumn,
  stateCommissions = DEFAULT_STATE_COMMISSIONS,
  onUpdateStateCommission,
}: TrackerSidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('columns')
  const visibleCount = columnVisibility.filter(c => c.visible).length

  // Calculator state
  const [calcMode, setCalcMode] = useState<CalculatorMode>('normal')
  const [calcInputs, setCalcInputs] = useState<CalculatorInputs>({
    betStake: '',
    backOdds: '',
    layOdds: '',
    commission: '8', // Default to 8% (VIC rate)
  })

  const calcResults = calculateResults(calcInputs, calcMode)

  const handleCalcInputChange = (field: keyof CalculatorInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalcInputs(prev => ({ ...prev, [field]: e.target.value }))
  }

  const tabs = [
    { id: 'columns' as TabId, icon: Columns, label: 'Columns' },
    { id: 'commission' as TabId, icon: Percent, label: 'Commission' },
    { id: 'calculator' as TabId, icon: Calculator, label: 'Calculator' },
  ]

  const handleTabClick = (tabId: TabId) => {
    if (!expanded) {
      onToggleExpand()
    }
    setActiveTab(tabId)
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Panel Content */}
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          width: expanded ? 240 : 0,
          height: '100%',
          border: expanded ? '1.5px solid #d1d5db' : 'none',
          borderRadius: 1,
          backgroundColor: '#fff',
        }}
      >
        {expanded && (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {activeTab === 'columns' && (
              <>
                {/* Column Visibility Toggles */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Columns size={18} color="#1a1a1a" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    Columns ({visibleCount}/{columnVisibility.length})
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {columnVisibility.map((col) => (
                    <Box
                      key={col.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 1,
                        backgroundColor: col.visible ? '#eff6ff' : '#fff',
                        border: '1.5px solid',
                        borderColor: col.visible ? '#3b82f6' : '#d1d5db',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: col.visible ? '#dbeafe' : '#f9fafb',
                          borderColor: col.visible ? '#2563eb' : '#9ca3af',
                        },
                      }}
                      onClick={() => onToggleColumn(col.id)}
                    >
                      <Typography sx={{ fontSize: '0.813rem', fontWeight: 500, color: '#1a1a1a' }}>
                        {col.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={col.visible}
                        onChange={() => onToggleColumn(col.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {activeTab === 'commission' && (
              <>
                {/* Commission Rate Settings */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Percent size={18} color="#1a1a1a" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    Betfair Commission
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>
                  Set commission rates by Australian state/territory
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {stateCommissions.map((state) => (
                    <Box
                      key={state.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        backgroundColor: '#fff',
                        border: '1.5px solid #d1d5db',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Tooltip title={state.label} placement="left">
                        <Typography sx={{ fontSize: '0.813rem', fontWeight: 600, color: '#1a1a1a', minWidth: 40 }}>
                          {state.shortLabel}
                        </Typography>
                      </Tooltip>
                      <TextField
                        size="small"
                        type="number"
                        value={state.rate}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          onUpdateStateCommission?.(state.id, value)
                        }}
                        inputProps={{
                          step: 0.5,
                          min: 0,
                          max: 100,
                          style: { textAlign: 'right', padding: '4px 8px' }
                        }}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        sx={{
                          width: 100,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#fff',
                          },
                          '& .MuiInputAdornment-root': {
                            marginLeft: 0,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </>
            )}

            {activeTab === 'calculator' && (
              <>
                {/* Lay Calculator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Calculator size={18} color="#1a1a1a" />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em' }}>
                    Lay Calculator
                  </Typography>
                </Box>

                {/* Mode Toggle */}
                <ToggleButtonGroup
                  value={calcMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setCalcMode(newMode)}
                  size="small"
                  sx={{ mb: 2, width: '100%' }}
                >
                  <ToggleButton
                    value="normal"
                    sx={{
                      flex: 1,
                      fontSize: '0.7rem',
                      py: 0.5,
                      textTransform: 'none',
                      '&.Mui-selected': {
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#2563eb' },
                      },
                    }}
                  >
                    Normal
                  </ToggleButton>
                  <ToggleButton
                    value="bonus"
                    sx={{
                      flex: 1,
                      fontSize: '0.7rem',
                      py: 0.5,
                      textTransform: 'none',
                      '&.Mui-selected': {
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#d97706' },
                      },
                    }}
                  >
                    Bonus (SNR)
                  </ToggleButton>
                </ToggleButtonGroup>

                {/* Input Fields */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    label="Bet Stake"
                    size="small"
                    type="number"
                    value={calcInputs.betStake}
                    onChange={handleCalcInputChange('betStake')}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ step: 1, min: 0 }}
                    fullWidth
                  />
                  <TextField
                    label="Back Odds"
                    size="small"
                    type="number"
                    value={calcInputs.backOdds}
                    onChange={handleCalcInputChange('backOdds')}
                    inputProps={{ step: 0.01, min: 1.01 }}
                    fullWidth
                  />
                  <TextField
                    label="Lay Odds"
                    size="small"
                    type="number"
                    value={calcInputs.layOdds}
                    onChange={handleCalcInputChange('layOdds')}
                    inputProps={{ step: 0.01, min: 1.01 }}
                    fullWidth
                  />
                  <TextField
                    label="Commission"
                    size="small"
                    type="number"
                    value={calcInputs.commission}
                    onChange={handleCalcInputChange('commission')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ step: 0.5, min: 0, max: 100 }}
                    fullWidth
                  />
                </Box>

                {/* Results */}
                {calcResults && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#1a1a1a', letterSpacing: '0.05em', mb: 1.5 }}>
                      Results
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Lay Stake */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #3b82f6' }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#1a1a1a' }}>Lay Stake</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#3b82f6' }}>
                          ${calcResults.layStake.toFixed(2)}
                        </Typography>
                      </Box>

                      {/* Liability */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, backgroundColor: '#fef3c7', borderRadius: 1, border: '1px solid #f59e0b' }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#1a1a1a' }}>Liability</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
                          ${calcResults.liability.toFixed(2)}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 0.5 }} />

                      {/* If Wins */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, backgroundColor: calcResults.profitIfWins >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 1, border: `1px solid ${calcResults.profitIfWins >= 0 ? '#22c55e' : '#ef4444'}` }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#1a1a1a' }}>If Wins</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: calcResults.profitIfWins >= 0 ? '#16a34a' : '#dc2626' }}>
                          {calcResults.profitIfWins >= 0 ? '+' : ''}${calcResults.profitIfWins.toFixed(2)}
                        </Typography>
                      </Box>

                      {/* If Loses */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, backgroundColor: calcResults.profitIfLoses >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 1, border: `1px solid ${calcResults.profitIfLoses >= 0 ? '#22c55e' : '#ef4444'}` }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#1a1a1a' }}>If Loses</Typography>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: calcResults.profitIfLoses >= 0 ? '#16a34a' : '#dc2626' }}>
                          {calcResults.profitIfLoses >= 0 ? '+' : ''}${calcResults.profitIfLoses.toFixed(2)}
                        </Typography>
                      </Box>

                      {/* Bonus Percentage (only for bonus mode) */}
                      {calcMode === 'bonus' && calcResults.bonusPercentage !== undefined && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, backgroundColor: '#f3e8ff', borderRadius: 1, border: '1px solid #a855f7' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: '#1a1a1a' }}>Bonus Return</Typography>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#7c3aed' }}>
                            {calcResults.bonusPercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </>
                )}

                {!calcResults && calcInputs.betStake && (
                  <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 2, textAlign: 'center' }}>
                    Enter valid odds (greater than 1.00)
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Right Tab Bar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          alignSelf: 'flex-start',
          width: 48,
          pt: 1,
          pb: 1,
          gap: 0.5,
          backgroundColor: '#fafafa',
          border: '1.5px solid #d1d5db',
          borderRadius: 1,
        }}
      >
        {/* Toggle arrow */}
        <IconButton
          size="small"
          onClick={onToggleExpand}
          sx={{
            p: 0.5,
            color: '#1a1a1a',
            '&:hover': { backgroundColor: '#e5e7eb' },
          }}
        >
          {expanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </IconButton>

        <Box sx={{ width: '70%', height: 1, backgroundColor: '#e5e7eb', my: 0.5 }} />

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id && expanded
          return (
            <Tooltip key={tab.id} title={tab.label} placement="left">
              <IconButton
                size="small"
                onClick={() => handleTabClick(tab.id)}
                sx={{
                  p: 1,
                  color: isActive ? '#3b82f6' : '#6b7280',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: isActive ? '#dbeafe' : '#f3f4f6',
                  },
                }}
              >
                <Icon size={18} />
              </IconButton>
            </Tooltip>
          )
        })}
      </Paper>
    </Box>
  )
}
