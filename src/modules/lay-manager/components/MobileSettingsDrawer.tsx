'use client'

import { useState } from 'react'
import {
  Box,
  SwipeableDrawer,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Switch,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Tooltip,
} from '@mui/material'
import { X, Columns, Percent, Calculator } from 'lucide-react'
import type { ColumnVisibility, StateCommission } from './TrackerSidePanel'

interface MobileSettingsDrawerProps {
  open: boolean
  onClose: () => void
  onOpen: () => void
  columnVisibility: ColumnVisibility[]
  onToggleColumn: (columnId: string) => void
  stateCommissions: StateCommission[]
  onUpdateStateCommission: (stateId: string, rate: number) => void
}

type TabId = 'columns' | 'commission' | 'calculator'
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

// Calculator functions (same as TrackerSidePanel)
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
    const bookmakerProfit = betStake * (backOdds - 1)
    profitIfWins = bookmakerProfit - liability
    const betfairProfit = layStake * (1 - commission / 100)
    profitIfLoses = -betStake + betfairProfit
  } else {
    const bookmakerProfit = betStake * (backOdds - 1)
    profitIfWins = bookmakerProfit - liability
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

export function MobileSettingsDrawer({
  open,
  onClose,
  onOpen,
  columnVisibility,
  onToggleColumn,
  stateCommissions,
  onUpdateStateCommission,
}: MobileSettingsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('columns')
  const visibleCount = columnVisibility.filter(c => c.visible).length

  // Calculator state
  const [calcMode, setCalcMode] = useState<CalculatorMode>('normal')
  const [calcInputs, setCalcInputs] = useState<CalculatorInputs>({
    betStake: '',
    backOdds: '',
    layOdds: '',
    commission: '8',
  })

  const calcResults = calculateResults(calcInputs, calcMode)

  const handleCalcInputChange = (field: keyof CalculatorInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalcInputs(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabId) => {
    setActiveTab(newValue)
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableSwipeToOpen={false}
      swipeAreaWidth={20}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '75vh',
          overflow: 'visible',
        },
      }}
    >
      {/* Puller handle */}
      <Box
        sx={{
          width: 40,
          height: 6,
          backgroundColor: '#d1d5db',
          borderRadius: 3,
          position: 'absolute',
          top: 8,
          left: 'calc(50% - 20px)',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 3,
          pb: 1,
          px: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid #e5e7eb',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 48,
          },
        }}
      >
        <Tab
          value="columns"
          label="Columns"
          icon={<Columns size={18} />}
          iconPosition="start"
        />
        <Tab
          value="commission"
          label="Commission"
          icon={<Percent size={18} />}
          iconPosition="start"
        />
        <Tab
          value="calculator"
          label="Calculator"
          icon={<Calculator size={18} />}
          iconPosition="start"
        />
      </Tabs>

      {/* Tab Content */}
      <Box
        sx={{
          p: 2,
          overflow: 'auto',
          maxHeight: 'calc(75vh - 140px)',
          // iOS safe area bottom padding
          pb: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Columns Tab */}
        {activeTab === 'columns' && (
          <>
            <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>
              Toggle which columns are visible ({visibleCount}/{columnVisibility.length})
            </Typography>

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
                    '&:active': {
                      backgroundColor: col.visible ? '#dbeafe' : '#f9fafb',
                    },
                  }}
                  onClick={() => onToggleColumn(col.id)}
                >
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#1a1a1a' }}>
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

        {/* Commission Tab */}
        {activeTab === 'commission' && (
          <>
            <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>
              Set Betfair commission rates by Australian state/territory
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
                  <Tooltip title={state.label} placement="top">
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', minWidth: 45 }}>
                      {state.shortLabel}
                    </Typography>
                  </Tooltip>
                  <TextField
                    size="small"
                    type="number"
                    value={state.rate}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      onUpdateStateCommission(state.id, value)
                    }}
                    inputProps={{
                      step: 0.5,
                      min: 0,
                      max: 100,
                      style: { textAlign: 'right', padding: '8px 12px' }
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={{
                      width: 110,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#fff',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <>
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
                  fontSize: '0.813rem',
                  py: 1,
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
                  fontSize: '0.813rem',
                  py: 1,
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
                inputProps={{ step: 1, min: 0, inputMode: 'decimal' }}
                fullWidth
              />
              <TextField
                label="Back Odds"
                size="small"
                type="number"
                value={calcInputs.backOdds}
                onChange={handleCalcInputChange('backOdds')}
                inputProps={{ step: 0.01, min: 1.01, inputMode: 'decimal' }}
                fullWidth
              />
              <TextField
                label="Lay Odds"
                size="small"
                type="number"
                value={calcInputs.layOdds}
                onChange={handleCalcInputChange('layOdds')}
                inputProps={{ step: 0.01, min: 1.01, inputMode: 'decimal' }}
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
                inputProps={{ step: 0.5, min: 0, max: 100, inputMode: 'decimal' }}
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1.5, backgroundColor: '#eff6ff', borderRadius: 1, border: '1px solid #3b82f6' }}>
                    <Typography sx={{ fontSize: '0.813rem', color: '#1a1a1a' }}>Lay Stake</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>
                      ${calcResults.layStake.toFixed(2)}
                    </Typography>
                  </Box>

                  {/* Liability */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1.5, backgroundColor: '#fef3c7', borderRadius: 1, border: '1px solid #f59e0b' }}>
                    <Typography sx={{ fontSize: '0.813rem', color: '#1a1a1a' }}>Liability</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#d97706' }}>
                      ${calcResults.liability.toFixed(2)}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 0.5 }} />

                  {/* If Wins */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1.5, backgroundColor: calcResults.profitIfWins >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 1, border: `1px solid ${calcResults.profitIfWins >= 0 ? '#22c55e' : '#ef4444'}` }}>
                    <Typography sx={{ fontSize: '0.813rem', color: '#1a1a1a' }}>If Wins</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: calcResults.profitIfWins >= 0 ? '#16a34a' : '#dc2626' }}>
                      {calcResults.profitIfWins >= 0 ? '+' : ''}${calcResults.profitIfWins.toFixed(2)}
                    </Typography>
                  </Box>

                  {/* If Loses */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1.5, backgroundColor: calcResults.profitIfLoses >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 1, border: `1px solid ${calcResults.profitIfLoses >= 0 ? '#22c55e' : '#ef4444'}` }}>
                    <Typography sx={{ fontSize: '0.813rem', color: '#1a1a1a' }}>If Loses</Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: calcResults.profitIfLoses >= 0 ? '#16a34a' : '#dc2626' }}>
                      {calcResults.profitIfLoses >= 0 ? '+' : ''}${calcResults.profitIfLoses.toFixed(2)}
                    </Typography>
                  </Box>

                  {/* Bonus Percentage (only for bonus mode) */}
                  {calcMode === 'bonus' && calcResults.bonusPercentage !== undefined && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1.5, backgroundColor: '#f3e8ff', borderRadius: 1, border: '1px solid #a855f7' }}>
                      <Typography sx={{ fontSize: '0.813rem', color: '#1a1a1a' }}>Bonus Return</Typography>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#7c3aed' }}>
                        {calcResults.bonusPercentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </>
            )}

            {!calcResults && calcInputs.betStake && (
              <Typography sx={{ fontSize: '0.813rem', color: '#6b7280', mt: 2, textAlign: 'center' }}>
                Enter valid odds (greater than 1.00)
              </Typography>
            )}
          </>
        )}
      </Box>
    </SwipeableDrawer>
  )
}
