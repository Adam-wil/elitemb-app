'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Select,
  FormControl,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { RefreshCw, CheckCircle, Plus, Trash2, AlertTriangle, ArrowUp, ArrowDown, Copy, Scissors, Lock, LockOpen, Rows, ClipboardPaste } from 'lucide-react'
import type { GridColDef, GridRenderCellParams, GridRenderEditCellParams, GridValueGetter, GridValueSetter, GridRowId } from '@mui/x-data-grid-premium'
import type { TrackedRaceEntry, RaceOutcome, RaceResultData, PromoType } from '../types'
import { OUTCOME_CONFIG, UNIT_TIER_CONFIG, PROMO_TYPE_CONFIG, type UnitTier } from '../types'
import { convertRaceTime } from '../utils/timezones'
import { getCommissionForTrack, type StateCommissionRate } from '../utils/trackerStorage'

// Comprehensive list of Australian and NZ tracks for autocomplete
const TRACKS = [
  // NSW
  'Randwick', 'Rosehill', 'Rosehill Gardens', 'Warwick Farm', 'Canterbury', 'Canterbury Park',
  'Gosford', 'Newcastle', 'Kembla Grange', 'Hawkesbury', 'Wyong', 'Scone', 'Grafton', 'Tamworth',
  'Muswellbrook', 'Dubbo', 'Albury', 'Wagga', 'Wagga Wagga', 'Port Macquarie', 'Coffs Harbour',
  'Moruya', 'Nowra', 'Queanbeyan', 'Taree', 'Bathurst', 'Mudgee', 'Goulburn', 'Gundagai', 'Ballina',
  'Lismore', 'Casino', 'Moree', 'Inverell', 'Armidale', 'Coonamble', 'Coonabarabran', 'Narromine',
  'Parkes', 'Orange', 'Wellington', 'Gilgandra', 'Condobolin', 'Forbes', 'Cowra', 'Young',
  'Cootamundra', 'Temora', 'Junee', 'Corowa', 'Deniliquin', 'Hay', 'Broken Hill', 'Bourke', 'Nyngan',
  // VIC
  'Flemington', 'Caulfield', 'Moonee Valley', 'Sandown', 'Sandown Hillside', 'Sandown Lakeside',
  'Cranbourne', 'Pakenham', 'Mornington', 'Ballarat', 'Geelong', 'Bendigo', 'Sale', 'Warrnambool',
  'Kyneton', 'Echuca', 'Wangaratta', 'Benalla', 'Seymour', 'Yarra Valley', 'Bal-Synth', 'Tatura',
  'Moe', 'Bairnsdale', 'Stawell', 'Ararat', 'Hamilton', 'Colac', 'Camperdown', 'Terang', 'Mortlake',
  'Wodonga', 'Kilmore', 'Hanging Rock', 'Donald', 'St Arnaud', 'Stony Creek', 'Mildura', 'Swan Hill',
  'Kerang', 'Avoca', 'Ballan', 'Casterton', 'Coleraine', 'Dunkeld', 'Horsham', 'Nhill', 'Edenhope',
  'Great Western', 'Werribee', 'Sportsbet-Pakenham',
  // QLD
  'Eagle Farm', 'Doomben', 'Gold Coast', 'Sunshine Coast', 'Ipswich', 'Toowoomba', 'Cairns',
  'Townsville', 'Mackay', 'Rockhampton', 'Bundaberg', 'Callaghan Park', 'Beaudesert', 'Gatton',
  'Kilcoy', 'Nanango', 'Gympie', 'Dalby', 'Warwick', 'Stanthorpe', 'Roma', 'Charleville',
  'Cunnamulla', 'Longreach', 'Barcaldine', 'Emerald', 'Clermont', 'Moranbah', 'Bowen', 'Proserpine',
  'Innisfail', 'Atherton', 'Mareeba', 'Mount Isa', 'Cloncurry', 'Julia Creek', 'Richmond',
  'Hughenden', 'Charters Towers', 'Ayr', 'Home Hill', 'Collinsville', 'Gladstone', 'Biloela',
  'Monto', 'Chinchilla', 'Miles', 'Goondiwindi', 'St George', 'Dirranbandi', 'Thangool',
  // SA
  'Morphettville', 'Morphettville Parks', 'Murray Bridge', 'Gawler', 'Strathalbyn', 'Port Lincoln',
  'Mount Gambier', 'Bordertown', 'Naracoorte', 'Penola', 'Millicent', 'Port Augusta', 'Balaklava',
  'Clare', 'Port Pirie', 'Kadina', 'Ceduna', 'Oakbank',
  // WA
  'Ascot', 'Belmont', 'Belmont Park', 'Pinjarra', 'Bunbury', 'Kalgoorlie', 'Albany', 'Geraldton',
  'Northam', 'York', 'Narrogin', 'Lark Hill', 'Broome', 'Carnarvon', 'Esperance', 'Mt Barker',
  'Beverley', 'Cunderdin', 'Merredin', 'Moora', 'Wongan Hills', 'Wagin', 'Katanning', 'Pingelly',
  'Kulin', 'Corrigin', 'Toodyay',
  // TAS
  'Hobart', 'Launceston', 'Devonport', 'Spreyton', 'Scottsdale', 'Longford', 'Burnie',
  // NT
  'Darwin', 'Fannie Bay', 'Alice Springs', 'Katherine', 'Tennant Creek',
  // ACT
  'Canberra', 'Thoroughbred Park',
  // NZ
  'Ellerslie', 'Trentham', 'Riccarton', 'Te Rapa', 'Hastings', 'Otaki', 'Awapuni', 'Wanganui',
  'New Plymouth', 'Hawera', 'Te Aroha', 'Matamata', 'Cambridge', 'Rotorua', 'Taupo', 'Tauranga',
  'Ruakaka', 'Pukekohe', 'Avondale', 'Waikato', 'Waipa', 'Woodville', 'Waverley', 'Tauherenikau',
  'Wingatui', 'Ascot Park', 'Invercargill', 'Gore', 'Cromwell', 'Oamaru', 'Timaru', 'Ashburton',
  'Rangiora', 'Methven', 'Westport', 'Greymouth', 'Reefton', 'Hokitika', 'Kumara', 'Nelson',
  'Blenheim', 'Kurow', 'Waimate', 'Wyndham', 'Riverton', 'Waikouaiti', 'Roxburgh', 'Omakau',
  'Tapanui', 'Balclutha',
].sort()

// Custom edit cell for track with type-ahead autocomplete
function TrackEditCell(props: GridRenderEditCellParams<TrackedRaceEntry>) {
  const { id, field, api, value } = props
  const [inputValue, setInputValue] = useState(value || '')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filteredTracks = useMemo(() => {
    if (!inputValue) return TRACKS.slice(0, 10)
    const lower = inputValue.toLowerCase()
    return TRACKS.filter(t => t.toLowerCase().includes(lower)).slice(0, 10)
  }, [inputValue])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    setHighlightIndex(0)
  }, [filteredTracks])

  useEffect(() => {
    if (listRef.current && highlightIndex >= 0) {
      const item = listRef.current.children[highlightIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightIndex])

  const selectTrack = (track: string) => {
    api.setEditCellValue({ id, field, value: track })
    api.stopCellEditMode({ id, field })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filteredTracks.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault()
      if (filteredTracks[highlightIndex]) {
        selectTrack(filteredTracks[highlightIndex])
      }
    } else if (event.key === 'Escape') {
      api.stopCellEditMode({ id, field, ignoreModifications: true })
    } else if (event.key === 'Tab') {
      if (filteredTracks[highlightIndex]) {
        api.setEditCellValue({ id, field, value: filteredTracks[highlightIndex] })
      }
    }
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          padding: '8px',
          fontSize: '14px',
          backgroundColor: 'transparent',
        }}
        autoComplete="off"
      />
      {filteredTracks.length > 0 && (
        <Box
          component="ul"
          ref={listRef}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 3,
            zIndex: 1300,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {filteredTracks.map((track, index) => (
            <Box
              component="li"
              key={track}
              onClick={() => selectTrack(track)}
              sx={{
                px: 1.5,
                py: 0.75,
                cursor: 'pointer',
                bgcolor: index === highlightIndex ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: '14px',
              }}
            >
              {track}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// Mobile card component for individual race entries
interface MobileTrackerCardProps {
  entry: TrackedRaceEntry
  onUpdate: (entryId: string, updates: Partial<TrackedRaceEntry>) => void
  onRefresh: (entryId: string) => Promise<void>
  onDelete: (entryId: string) => void
  isRefreshing: boolean
  stateCommissions?: StateCommissionRate[]
}

function MobileTrackerCard({ entry, onUpdate, onRefresh, onDelete, isRefreshing, stateCommissions }: MobileTrackerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const commission = stateCommissions && entry.track
    ? getCommissionForTrack(entry.track, stateCommissions)
    : entry.layBet?.commissionPercent ?? 5

  const handleStartEdit = (field: string, value: string | number) => {
    setEditingField(field)
    setEditValue(String(value || ''))
  }

  const handleSaveEdit = () => {
    if (!editingField) return

    let updates: Partial<TrackedRaceEntry> = {}
    const value = editValue.trim()

    switch (editingField) {
      case 'time':
        updates.time = value
        break
      case 'track':
        updates.track = value
        break
      case 'raceNumber':
        updates.raceNumber = parseInt(value, 10) || 0
        break
      case 'selectionNumber':
        updates.selectionNumber = parseInt(value, 10) || 0
        break
      case 'selectionName':
        updates.selectionName = value
        break
      case 'bookie':
        updates.backBet = { ...entry.backBet, bookie: value }
        break
      case 'backStake':
        updates.backBet = { ...entry.backBet, stake: parseFloat(value) || 0 }
        break
      case 'backOdds':
        updates.backBet = { ...entry.backBet, odds: parseFloat(value) || 0 }
        break
      case 'layStake':
        updates.layBet = { ...entry.layBet, stake: parseFloat(value) || 0 }
        break
      case 'layOdds':
        updates.layBet = { ...entry.layBet, odds: parseFloat(value) || 0 }
        break
      case 'outcome':
        updates.outcome = value as RaceOutcome
        break
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(entry.id, updates)
    }
    setEditingField(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingField(null)
      setEditValue('')
    }
  }

  const renderEditableField = (
    field: string,
    value: string | number,
    label: string,
    type: 'text' | 'number' | 'select' = 'text',
    options?: string[]
  ) => {
    if (editingField === field) {
      if (type === 'select' && options) {
        return (
          <FormControl size="small" fullWidth>
            <Select
              native
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              autoFocus
              sx={{ fontSize: '0.875rem' }}
            >
              <option value="">-</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </Select>
          </FormControl>
        )
      }
      return (
        <input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '1rem',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            outline: 'none',
            backgroundColor: '#fff',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
          }}
        />
      )
    }

    return (
      <Box
        onClick={() => !entry.readOnly && handleStartEdit(field, value)}
        sx={{
          cursor: entry.readOnly ? 'default' : 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          minHeight: '28px',
          display: 'flex',
          alignItems: 'center',
          '&:hover': entry.readOnly ? {} : { backgroundColor: '#f0f9ff' },
        }}
      >
        <Typography variant="body2" sx={{ color: value ? '#1f2937' : '#9ca3af' }}>
          {value || '-'}
        </Typography>
      </Box>
    )
  }

  const outcomeConfig = entry.outcome ? OUTCOME_CONFIG[entry.outcome] : null
  const unitTierConfig = entry.unitTier ? UNIT_TIER_CONFIG[entry.unitTier] : null

  return (
    <Card
      sx={{
        mb: 1.5,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        opacity: entry.readOnly ? 0.8 : 1,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header row - Time, Track, Race */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              onClick={() => !entry.readOnly && handleStartEdit('time', entry.time)}
            >
              {editingField === 'time' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '70px',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: '2px solid #3b82f6',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                  }}
                />
              ) : (
                entry.time || '--:--'
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>|</Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: '#1f2937', cursor: 'pointer' }}
              onClick={() => !entry.readOnly && handleStartEdit('track', entry.track)}
            >
              {editingField === 'track' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '120px',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    border: '2px solid #3b82f6',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                  }}
                />
              ) : (
                entry.track || 'Track'
              )}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: '#6b7280', cursor: 'pointer' }}
              onClick={() => !entry.readOnly && handleStartEdit('raceNumber', entry.raceNumber)}
            >
              {editingField === 'raceNumber' ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{
                    width: '50px',
                    padding: '8px 10px',
                    fontSize: '0.875rem',
                    border: '2px solid #3b82f6',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                  }}
                />
              ) : (
                `R${entry.raceNumber || '?'}`
              )}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {outcomeConfig && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  backgroundColor: outcomeConfig.bgColor,
                  color: outcomeConfig.color,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {outcomeConfig.label}
              </Box>
            )}
            <IconButton size="small" onClick={() => onRefresh(entry.id)} disabled={isRefreshing}>
              {isRefreshing ? <CircularProgress size={16} /> : entry.autoResult ? <CheckCircle size={16} color="#16a34a" /> : <RefreshCw size={16} color="#6b7280" />}
            </IconButton>
          </Box>
        </Box>

        {/* Selection row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: '#1f2937', minWidth: '24px', cursor: 'pointer' }}
            onClick={() => !entry.readOnly && handleStartEdit('selectionNumber', entry.selectionNumber)}
          >
            {editingField === 'selectionNumber' ? (
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{
                  width: '50px',
                  padding: '8px 10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                }}
              />
            ) : (
              `#${entry.selectionNumber || '?'}`
            )}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: '#1f2937', flex: 1, cursor: 'pointer' }}
            onClick={() => !entry.readOnly && handleStartEdit('selectionName', entry.selectionName)}
          >
            {editingField === 'selectionName' ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.875rem',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                }}
              />
            ) : (
              entry.selectionName || 'Selection'
            )}
          </Typography>
          {unitTierConfig && (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: entry.unitTier === 'green' ? '#dcfce7' : entry.unitTier === 'pink' ? '#fce7f3' : '#f3f4f6',
                color: entry.unitTier === 'green' ? '#166534' : entry.unitTier === 'pink' ? '#be185d' : '#6b7280',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {unitTierConfig.label}
            </Box>
          )}
        </Box>

        {/* Bookie row */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>BOOKIE</Typography>
          {renderEditableField('bookie', entry.backBet?.bookie || '', 'Bookie')}
        </Box>

        {/* Back bet row - light blue background */}
        <Box sx={{ backgroundColor: '#e0f2fe', borderRadius: 1, p: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#0369a1', fontSize: '0.7rem', fontWeight: 600 }}>BACK BET</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>Stake $</Typography>
              {renderEditableField('backStake', entry.backBet?.stake || '', 'Stake', 'number')}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>Odds</Typography>
              {renderEditableField('backOdds', entry.backBet?.odds || '', 'Odds', 'number')}
            </Box>
          </Box>
        </Box>

        {/* Lay bet row - light yellow background */}
        <Box sx={{ backgroundColor: '#fef9c3', borderRadius: 1, p: 1, mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#a16207', fontSize: '0.7rem', fontWeight: 600 }}>LAY BET (Betfair)</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>Lay $</Typography>
              {renderEditableField('layStake', entry.layBet?.stake || '', 'Lay', 'number')}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>Odds</Typography>
              {renderEditableField('layOdds', entry.layBet?.odds || '', 'Odds', 'number')}
            </Box>
            <Box sx={{ width: '60px' }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.65rem' }}>Comm%</Typography>
              <Typography variant="body2" sx={{ color: '#1f2937', p: '4px 8px' }}>{commission}%</Typography>
            </Box>
          </Box>
        </Box>

        {/* Expand/collapse for more options */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            py: 0.5,
            color: '#6b7280',
            '&:hover': { color: '#374151' },
          }}
        >
          <Typography variant="caption" sx={{ mr: 0.5 }}>
            {expanded ? 'Less' : 'More'}
          </Typography>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ pt: 1, borderTop: '1px solid #e5e7eb' }}>
            {/* Outcome */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>OUTCOME</Typography>
              {renderEditableField('outcome', entry.outcome || '', 'Outcome', 'select', Object.keys(OUTCOME_CONFIG))}
            </Box>

            {/* Result */}
            {entry.autoResult && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>RESULT</Typography>
                <Typography variant="body2" sx={{ color: '#1f2937' }}>
                  {entry.autoResult.winnerNumber}. {entry.autoResult.winnerName}
                </Typography>
              </Box>
            )}

            {/* Delete button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<Trash2 size={14} />}
                onClick={() => onDelete(entry.id)}
                disabled={entry.readOnly}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

interface TrackerDataGridProps {
  entries: TrackedRaceEntry[]
  selectedDate: string
  selectedDateISO?: string
  timezone?: string
  onEntryUpdate: (entryId: string, updates: Partial<TrackedRaceEntry>) => void
  onRefreshResult: (entryId: string) => Promise<RaceResultData | null>
  onAddEntry: (afterId?: string) => void
  onAddEntryAbove: (beforeId: string) => void
  onDeleteEntry: (entryId: string) => void
  isPolling?: boolean
  columnVisibility?: Record<string, boolean> // Column visibility model
  stateCommissions?: StateCommissionRate[] // State commission rates for auto-calculating Comm%
}

type ContextMenuState = {
  mouseX: number
  mouseY: number
  rowId: string
  row: TrackedRaceEntry
  field: string | null  // The clicked cell's field name
  cellValue: unknown    // The cell's current value
} | null

export function TrackerDataGrid({
  entries,
  selectedDate,
  selectedDateISO = '',
  timezone = 'melbourne',
  onEntryUpdate,
  onRefreshResult,
  onAddEntry,
  onAddEntryAbove,
  onDeleteEntry,
  columnVisibility = {},
  stateCommissions,
}: TrackerDataGridProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) // Below 900px

  const [GridComponent, setGridComponent] = useState<typeof import('@mui/x-data-grid-premium').DataGridPremium | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<TrackedRaceEntry | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)

  const convertedEntries = useMemo(() => {
    if (!selectedDateISO || timezone === 'melbourne') {
      return entries
    }
    return entries.map((entry) => ({
      ...entry,
      time: convertRaceTime(entry.time, selectedDateISO, timezone),
    }))
  }, [entries, selectedDateISO, timezone])

  useEffect(() => {
    import('@mui/x-data-grid-premium').then((mod) => {
      setGridComponent(() => mod.DataGridPremium)
    })
  }, [])

  const handleRefreshClick = useCallback(async (entryId: string) => {
    setRefreshingId(entryId)
    try {
      await onRefreshResult(entryId)
    } catch (error) {
      console.error(`Refresh error for entry ${entryId}:`, error)
    } finally {
      setRefreshingId(null)
    }
  }, [onRefreshResult])

  const handleDeleteClick = useCallback((entry: TrackedRaceEntry) => {
    // If it's from the planner, show confirmation
    if (entry.planEntryId) {
      setEntryToDelete(entry)
      setDeleteDialogOpen(true)
    } else {
      // Manual entry, delete directly
      onDeleteEntry(entry.id)
    }
  }, [onDeleteEntry])

  const handleConfirmDelete = useCallback(() => {
    if (entryToDelete) {
      onDeleteEntry(entryToDelete.id)
      setEntryToDelete(null)
      setDeleteDialogOpen(false)
    }
  }, [entryToDelete, onDeleteEntry])

  const handleCancelDelete = useCallback(() => {
    setEntryToDelete(null)
    setDeleteDialogOpen(false)
  }, [])

  // Context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, row: TrackedRaceEntry, field: string | null, cellValue: unknown) => {
    event.preventDefault()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      rowId: row.id,
      row,
      field,
      cellValue,
    })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleInsertRowAbove = useCallback(() => {
    if (contextMenu) {
      onAddEntryAbove(contextMenu.rowId)
      setContextMenu(null)
    }
  }, [contextMenu, onAddEntryAbove])

  const handleInsertRowBelow = useCallback(() => {
    if (contextMenu) {
      onAddEntry(contextMenu.rowId)
      setContextMenu(null)
    }
  }, [contextMenu, onAddEntry])

  const handleRemoveRow = useCallback(() => {
    if (contextMenu) {
      handleDeleteClick(contextMenu.row)
      setContextMenu(null)
    }
  }, [contextMenu, handleDeleteClick])

  // Get cell value as string for clipboard
  const getCellValueAsString = useCallback((value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }, [])

  // Editable fields that can be cut (cleared after copy)
  const editableFields = ['selectionNumber', 'selectionName', 'promoType', 'bookie', 'backStake', 'backOdds', 'layStake', 'layOdds', 'layCommission', 'time', 'track', 'raceNumber']

  const handleCopyCell = useCallback(async () => {
    if (contextMenu && contextMenu.field) {
      const text = getCellValueAsString(contextMenu.cellValue)
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setContextMenu(null)
    }
  }, [contextMenu, getCellValueAsString])

  const handleCutCell = useCallback(async () => {
    if (contextMenu && contextMenu.field) {
      // Copy cell value first
      const text = getCellValueAsString(contextMenu.cellValue)
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      // Clear the cell based on field type
      const field = contextMenu.field
      let updates: Partial<TrackedRaceEntry> = {}

      if (field === 'time') {
        updates.time = ''
      } else if (field === 'track') {
        updates.track = ''
      } else if (field === 'raceNumber') {
        updates.raceNumber = 0
      } else if (field === 'selectionNumber') {
        updates.selectionNumber = 0
      } else if (field === 'selectionName') {
        updates.selectionName = ''
      } else if (field === 'bookie') {
        updates.backBet = { ...contextMenu.row.backBet, bookie: '' }
      } else if (field === 'backStake') {
        updates.backBet = { ...contextMenu.row.backBet, stake: 0 }
      } else if (field === 'backOdds') {
        updates.backBet = { ...contextMenu.row.backBet, odds: 0 }
      } else if (field === 'layStake') {
        updates.layBet = { ...contextMenu.row.layBet, stake: 0 }
      } else if (field === 'layOdds') {
        updates.layBet = { ...contextMenu.row.layBet, odds: 0 }
      } else if (field === 'layCommission') {
        updates.layBet = { ...contextMenu.row.layBet, commissionPercent: 0 }
      }

      if (Object.keys(updates).length > 0) {
        onEntryUpdate(contextMenu.rowId, updates)
      }
      setContextMenu(null)
    }
  }, [contextMenu, getCellValueAsString, onEntryUpdate])

  const canCutCell = contextMenu?.field && editableFields.includes(contextMenu.field)

  const handlePasteCell = useCallback(async () => {
    if (contextMenu && contextMenu.field && !contextMenu.row.readOnly) {
      let clipboardText = ''
      try {
        clipboardText = await navigator.clipboard.readText()
      } catch (err) {
        // Clipboard read failed - might need user permission or not available
        console.error('Failed to read clipboard:', err)
        return
      }

      if (!clipboardText) {
        setContextMenu(null)
        return
      }

      // Apply the pasted value based on field type
      const field = contextMenu.field
      let updates: Partial<TrackedRaceEntry> = {}

      if (field === 'time') {
        updates.time = clipboardText.trim()
      } else if (field === 'track') {
        updates.track = clipboardText.trim()
      } else if (field === 'raceNumber') {
        const num = parseInt(clipboardText.trim(), 10)
        if (!isNaN(num)) updates.raceNumber = num
      } else if (field === 'selectionNumber') {
        const num = parseInt(clipboardText.trim(), 10)
        if (!isNaN(num)) updates.selectionNumber = num
      } else if (field === 'selectionName') {
        updates.selectionName = clipboardText.trim()
      } else if (field === 'bookie') {
        updates.backBet = { ...contextMenu.row.backBet, bookie: clipboardText.trim() }
      } else if (field === 'backStake') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.backBet = { ...contextMenu.row.backBet, stake: num }
      } else if (field === 'backOdds') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.backBet = { ...contextMenu.row.backBet, odds: num }
      } else if (field === 'layStake') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, stake: num }
      } else if (field === 'layOdds') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, odds: num }
      } else if (field === 'layCommission') {
        const num = parseFloat(clipboardText.trim())
        if (!isNaN(num)) updates.layBet = { ...contextMenu.row.layBet, commissionPercent: num }
      }

      if (Object.keys(updates).length > 0) {
        onEntryUpdate(contextMenu.rowId, updates)
      }
      setContextMenu(null)
    }
  }, [contextMenu, onEntryUpdate])

  const handleCopyRow = useCallback(async () => {
    if (contextMenu) {
      const row = contextMenu.row
      const text = `${row.time}\t${row.track}\tR${row.raceNumber}\t${row.backBet?.bookie || ''}\t${row.selectionNumber}\t${row.selectionName}\t${row.backBet?.stake || ''}\t${row.backBet?.odds || ''}\t${row.layBet?.stake || ''}\t${row.layBet?.odds || ''}`
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setContextMenu(null)
    }
  }, [contextMenu])

  const handleToggleReadOnly = useCallback(() => {
    if (contextMenu) {
      const currentReadOnly = contextMenu.row.readOnly || false
      onEntryUpdate(contextMenu.rowId, { readOnly: !currentReadOnly })
      setContextMenu(null)
    }
  }, [contextMenu, onEntryUpdate])

  // Get cell value for the selected cell (keyboard shortcuts)
  const getSelectedCellValue = useCallback((): unknown => {
    if (!selectedRowId || !selectedField) return null
    const row = entries.find(e => e.id === selectedRowId)
    if (!row) return null

    if (selectedField === 'bookie') return row.backBet?.bookie
    if (selectedField === 'backStake') return row.backBet?.stake
    if (selectedField === 'backOdds') return row.backBet?.odds
    if (selectedField === 'layStake') return row.layBet?.stake
    if (selectedField === 'layOdds') return row.layBet?.odds
    if (selectedField === 'layCommission') return row.layBet?.commissionPercent ?? 5
    return (row as unknown as Record<string, unknown>)[selectedField]
  }, [selectedRowId, selectedField, entries])

  // Keyboard shortcut handlers
  const handleKeyboardCopy = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const value = getSelectedCellValue()
    const text = getCellValueAsString(value)
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }, [selectedRowId, selectedField, getSelectedCellValue, getCellValueAsString])

  const handleKeyboardCut = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const row = entries.find(e => e.id === selectedRowId)
    if (!row || row.readOnly) return
    if (!editableFields.includes(selectedField)) return

    // Copy first
    await handleKeyboardCopy()

    // Then clear
    let updates: Partial<TrackedRaceEntry> = {}
    if (selectedField === 'time') updates.time = ''
    else if (selectedField === 'track') updates.track = ''
    else if (selectedField === 'raceNumber') updates.raceNumber = 0
    else if (selectedField === 'selectionNumber') updates.selectionNumber = 0
    else if (selectedField === 'selectionName') updates.selectionName = ''
    else if (selectedField === 'bookie') updates.backBet = { ...row.backBet, bookie: '' }
    else if (selectedField === 'backStake') updates.backBet = { ...row.backBet, stake: 0 }
    else if (selectedField === 'backOdds') updates.backBet = { ...row.backBet, odds: 0 }
    else if (selectedField === 'layStake') updates.layBet = { ...row.layBet, stake: 0 }
    else if (selectedField === 'layOdds') updates.layBet = { ...row.layBet, odds: 0 }
    else if (selectedField === 'layCommission') updates.layBet = { ...row.layBet, commissionPercent: 0 }

    if (Object.keys(updates).length > 0) {
      onEntryUpdate(selectedRowId, updates)
    }
  }, [selectedRowId, selectedField, entries, editableFields, handleKeyboardCopy, onEntryUpdate])

  const handleKeyboardPaste = useCallback(async () => {
    if (!selectedRowId || !selectedField) return
    const row = entries.find(e => e.id === selectedRowId)
    if (!row || row.readOnly) return
    if (!editableFields.includes(selectedField)) return

    let clipboardText = ''
    try {
      clipboardText = await navigator.clipboard.readText()
    } catch (err) {
      return
    }

    if (!clipboardText) return

    let updates: Partial<TrackedRaceEntry> = {}
    if (selectedField === 'time') updates.time = clipboardText.trim()
    else if (selectedField === 'track') updates.track = clipboardText.trim()
    else if (selectedField === 'raceNumber') {
      const num = parseInt(clipboardText.trim(), 10)
      if (!isNaN(num)) updates.raceNumber = num
    }
    else if (selectedField === 'selectionNumber') {
      const num = parseInt(clipboardText.trim(), 10)
      if (!isNaN(num)) updates.selectionNumber = num
    }
    else if (selectedField === 'selectionName') updates.selectionName = clipboardText.trim()
    else if (selectedField === 'bookie') updates.backBet = { ...row.backBet, bookie: clipboardText.trim() }
    else if (selectedField === 'backStake') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.backBet = { ...row.backBet, stake: num }
    }
    else if (selectedField === 'backOdds') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.backBet = { ...row.backBet, odds: num }
    }
    else if (selectedField === 'layStake') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, stake: num }
    }
    else if (selectedField === 'layOdds') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, odds: num }
    }
    else if (selectedField === 'layCommission') {
      const num = parseFloat(clipboardText.trim())
      if (!isNaN(num)) updates.layBet = { ...row.layBet, commissionPercent: num }
    }

    if (Object.keys(updates).length > 0) {
      onEntryUpdate(selectedRowId, updates)
    }
  }, [selectedRowId, selectedField, entries, editableFields, onEntryUpdate])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if we have a selected cell and not in edit mode
      if (!selectedRowId || !selectedField) return

      // Check if we're in an input/textarea (editing mode)
      const activeElement = document.activeElement
      const isEditing = activeElement?.tagName === 'INPUT' ||
                        activeElement?.tagName === 'TEXTAREA' ||
                        activeElement?.getAttribute('role') === 'textbox'
      if (isEditing) return

      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardCopy()
      } else if ((event.ctrlKey || event.metaKey) && key === 'x') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardCut()
      } else if ((event.ctrlKey || event.metaKey) && key === 'v') {
        event.preventDefault()
        event.stopPropagation()
        handleKeyboardPaste()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true) // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [selectedRowId, selectedField, handleKeyboardCopy, handleKeyboardCut, handleKeyboardPaste])

  const processRowUpdate = useCallback((newRow: TrackedRaceEntry, oldRow: TrackedRaceEntry) => {
    // Handle time, track, raceNumber changes (for manual entries)
    if (newRow.time !== oldRow.time) {
      onEntryUpdate(newRow.id, { time: newRow.time })
    }
    if (newRow.track !== oldRow.track) {
      onEntryUpdate(newRow.id, { track: newRow.track })
    }
    if (newRow.raceNumber !== oldRow.raceNumber) {
      onEntryUpdate(newRow.id, { raceNumber: newRow.raceNumber })
    }
    if (newRow.selectionNumber !== oldRow.selectionNumber) {
      onEntryUpdate(newRow.id, { selectionNumber: newRow.selectionNumber })
    }
    if (newRow.selectionName !== oldRow.selectionName) {
      onEntryUpdate(newRow.id, { selectionName: newRow.selectionName })
    }
    if (newRow.outcome !== oldRow.outcome) {
      onEntryUpdate(newRow.id, { outcome: newRow.outcome })
    }
    if (newRow.promoType !== oldRow.promoType) {
      onEntryUpdate(newRow.id, { promoType: newRow.promoType })
    }
    // Handle backBet changes (including bookie field)
    if (JSON.stringify(newRow.backBet) !== JSON.stringify(oldRow.backBet)) {
      onEntryUpdate(newRow.id, { backBet: newRow.backBet })
    }
    if (JSON.stringify(newRow.layBet) !== JSON.stringify(oldRow.layBet)) {
      onEntryUpdate(newRow.id, { layBet: newRow.layBet })
    }
    return newRow
  }, [onEntryUpdate])

  
  if (entries.length === 0) {
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
          borderRadius: 2,
          border: '1px dashed #d1d5db',
          gap: 2,
        }}
      >
        <Typography sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          No races locked in for {selectedDate}. Use the Planner to lock in races or add manually.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() => onAddEntry()}
          sx={{ textTransform: 'none' }}
        >
          Add Row
        </Button>
      </Box>
    )
  }

  if (!GridComponent) {
    return (
      <Box sx={{ height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  const columns = [
    {
      field: 'time',
      headerName: 'Time',
      width: 80,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'track',
      headerName: 'Track',
      width: 130,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderEditCell: (params: GridRenderEditCellParams<TrackedRaceEntry>) => <TrackEditCell {...params} />,
    },
    {
      field: 'raceNumber',
      headerName: 'Race',
      width: 60,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'unitTier',
      headerName: 'Units',
      width: 80,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { value?: UnitTier }) => {
        const tier = params.value || 'neutral'
        const config = UNIT_TIER_CONFIG[tier]
        const colorMap: Record<UnitTier, { bg: string; text: string }> = {
          green: { bg: '#dcfce7', text: '#166534' },
          neutral: { bg: '#f3f4f6', text: '#6b7280' },
          pink: { bg: '#fce7f3', text: '#be185d' },
        }
        const colors = colorMap[tier]

        return (
          <Tooltip title={config.description}>
            <Box sx={{
              width: 60,
              py: 0.5,
              borderRadius: 1.5,
              backgroundColor: colors.bg,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: colors.text, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                {config.label}
              </Typography>
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'selectionNumber',
      headerName: 'No #',
      width: 70,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'promoType',
      headerName: 'Promo',
      width: 100,
      editable: true,
      type: 'singleSelect' as const,
      valueOptions: ['none', '2nd_bonus', '2nd_3rd_bonus', 'bet_back'],
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { value?: PromoType }) => {
        const promoType = params.value || 'none'
        const config = PROMO_TYPE_CONFIG[promoType]
        return (
          <Tooltip title={config.description}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: promoType === 'none' ? '#f3f4f6' : '#dbeafe',
                color: promoType === 'none' ? '#6b7280' : '#1e40af',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {config.label}
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'selectionName',
      headerName: 'Selection',
      width: 160,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
    },
    {
      field: 'bookie',
      headerName: 'Bookie',
      width: 180,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.bookie || '',
      valueSetter: (value: string, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, bookie: value || '' },
      }),
    },
    {
      field: 'backStake',
      headerName: 'Back $',
      width: 80,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, stake: value || 0 },
      }),
    },
    {
      field: 'backOdds',
      headerName: 'Odds',
      width: 70,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.odds || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, odds: value || 0 },
      }),
    },
    {
      field: 'layStake',
      headerName: 'Lay $',
      width: 80,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, stake: value || 0 },
      }),
    },
    {
      field: 'layOdds',
      headerName: 'Odds',
      width: 70,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.odds || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, odds: value || 0 },
      }),
    },
    {
      field: 'layCommission',
      headerName: 'Comm%',
      width: 75,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => {
        // Auto-calculate commission based on track's state if stateCommissions provided
        if (stateCommissions && row.track) {
          return getCommissionForTrack(row.track, stateCommissions)
        }
        // Fallback to stored value or default
        return row.layBet?.commissionPercent ?? 5
      },
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, commissionPercent: value || 0 },
      }),
    },
    {
      field: 'autoResult',
      headerName: 'Result',
      width: 200,
      editable: false,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const result = params.row.autoResult
        if (!result) {
          return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>
        }
        return (
          <Tooltip title={`${result.winnerNumber}. ${result.winnerName}`}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.winnerNumber}. {result.winnerName}
            </span>
          </Tooltip>
        )
      },
    },
    {
      field: 'outcome',
      headerName: 'Outcome',
      width: 110,
      editable: true,
      type: 'singleSelect' as const,
      valueOptions: Object.keys(OUTCOME_CONFIG),
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry; value?: RaceOutcome }) => {
        const outcome = params.value || 'Pending'
        const outcomeConfig = OUTCOME_CONFIG[outcome]
        const result = params.row.autoResult

        // Build tooltip content showing race places
        const tooltipContent = result?.places ? (
          <Box sx={{ p: 0.5 }}>
            {result.places.first && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                1st: {result.places.first.number}. {result.places.first.name}
              </Typography>
            )}
            {result.places.second && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                2nd: {result.places.second.number}. {result.places.second.name}
              </Typography>
            )}
            {result.places.third && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                3rd: {result.places.third.number}. {result.places.third.name}
              </Typography>
            )}
          </Box>
        ) : (
          'No result yet'
        )

        return (
          <Tooltip title={tooltipContent}>
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: outcomeConfig.bgColor,
                color: outcomeConfig.color,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {outcomeConfig.label}
            </Box>
          </Tooltip>
        )
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      renderCell: (params: { row: TrackedRaceEntry }) => {
        const isRefreshing = refreshingId === params.row.id
        const hasResult = !!params.row.autoResult

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={hasResult ? 'Refresh result' : 'Fetch result'}>
              <IconButton
                size="small"
                onClick={() => handleRefreshClick(params.row.id)}
                disabled={isRefreshing}
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': { backgroundColor: '#f3f4f6' },
                }}
              >
                {isRefreshing ? (
                  <CircularProgress size={16} />
                ) : hasResult ? (
                  <CheckCircle size={16} color="#16a34a" />
                ) : (
                  <RefreshCw size={16} color="#6b7280" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.readOnly ? 'Row is read-only' : params.row.planEntryId ? 'Delete (from planner)' : 'Delete row'}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteClick(params.row)}
                  disabled={params.row.readOnly}
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover:not(:disabled)': { backgroundColor: '#fee2e2', color: '#dc2626' },
                  }}
                >
                  <Trash2 size={16} color={params.row.readOnly ? '#d1d5db' : params.row.planEntryId ? '#f59e0b' : '#6b7280'} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )
      },
    },
  ]

  // Mobile view - card based layout
  if (isMobile) {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Header with Add button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
            {convertedEntries.length} race{convertedEntries.length !== 1 ? 's' : ''}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() => onAddEntry()}
            sx={{ textTransform: 'none' }}
          >
            Add
          </Button>
        </Box>

        {/* Card list */}
        <Box>
          {convertedEntries.map((entry) => (
            <MobileTrackerCard
              key={entry.id}
              entry={entry}
              onUpdate={onEntryUpdate}
              onRefresh={handleRefreshClick}
              onDelete={(id) => {
                const entryToRemove = entries.find(e => e.id === id)
                if (entryToRemove) {
                  handleDeleteClick(entryToRemove)
                }
              }}
              isRefreshing={refreshingId === entry.id}
              stateCommissions={stateCommissions}
            />
          ))}
        </Box>

        {/* Delete Confirmation Dialog - shared with desktop */}
        <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertTriangle size={20} color="#f59e0b" />
            Delete Entry
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {entryToDelete?.planEntryId
                ? 'This entry was imported from the planner. Are you sure you want to delete it?'
                : 'Are you sure you want to delete this entry?'}
            </DialogContentText>
            {entryToDelete && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9fafb', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>{entryToDelete.time}</strong> - {entryToDelete.track} R{entryToDelete.raceNumber}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  // Desktop view - data grid
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1 }}>
        {selectedRowId && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            New row will be added below selected
          </Typography>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() => onAddEntry(selectedRowId || undefined)}
          sx={{ textTransform: 'none' }}
        >
          Add Row
        </Button>
      </Box>
      <Box
        sx={{ flexGrow: 1 }}
        onContextMenu={(event: React.MouseEvent) => {
          // Find the closest row and cell elements
          const target = event.target as HTMLElement
          const rowElement = target.closest('.MuiDataGrid-row')
          const cellElement = target.closest('.MuiDataGrid-cell')
          if (rowElement) {
            const rowId = rowElement.getAttribute('data-id')
            if (rowId) {
              const row = entries.find(e => e.id === rowId)
              if (row) {
                event.preventDefault()
                // Get the field name from the cell's data-field attribute
                const field = cellElement?.getAttribute('data-field') || null
                // Get the cell value based on the field
                let cellValue: unknown = null
                if (field) {
                  if (field === 'bookie') cellValue = row.backBet?.bookie
                  else if (field === 'backStake') cellValue = row.backBet?.stake
                  else if (field === 'backOdds') cellValue = row.backBet?.odds
                  else if (field === 'layStake') cellValue = row.layBet?.stake
                  else if (field === 'layOdds') cellValue = row.layBet?.odds
                  else if (field === 'layCommission') cellValue = row.layBet?.commissionPercent ?? 5
                  else cellValue = (row as unknown as Record<string, unknown>)[field]
                }
                handleContextMenu(event, row, field, cellValue)
              }
            }
          }
        }}
      >
        <GridComponent
          rows={convertedEntries}
          columns={columns}
          rowHeight={44}
          columnHeaderHeight={48}
          autoHeight
          disableRowSelectionOnClick
          disableColumnSorting
          columnVisibilityModel={columnVisibility}
          processRowUpdate={processRowUpdate}
          onCellClick={(params) => {
            setSelectedRowId(params.row.id)
            setSelectedField(params.field)
          }}
          getRowClassName={(params) => {
            const classes = []
            if (params.row.id === selectedRowId) classes.push('row-selected')
            if (params.row.readOnly) classes.push('row-read-only')
            return classes.join(' ')
          }}
          isCellEditable={(params) => !params.row.readOnly}
          cellSelection
          onCellKeyDown={(params, event) => {
            // Tab navigation between cells
            if (event.key === 'Tab') {
              event.preventDefault()
              const api = params.api
              const allColumns = api.getAllColumns().filter(col => col.field !== '__check__' && col.field !== 'actions')
              const currentColIndex = allColumns.findIndex(col => col.field === params.field)
              const allRows = api.getAllRowIds()
              const currentRowIndex = allRows.indexOf(params.id)

              if (event.shiftKey) {
                // Shift+Tab: go to previous cell
                if (currentColIndex > 0) {
                  api.setCellFocus(params.id, allColumns[currentColIndex - 1].field)
                } else if (currentRowIndex > 0) {
                  api.setCellFocus(allRows[currentRowIndex - 1], allColumns[allColumns.length - 1].field)
                }
              } else {
                // Tab: go to next cell
                if (currentColIndex < allColumns.length - 1) {
                  api.setCellFocus(params.id, allColumns[currentColIndex + 1].field)
                } else if (currentRowIndex < allRows.length - 1) {
                  api.setCellFocus(allRows[currentRowIndex + 1], allColumns[0].field)
                }
              }
            }
          }}
        sx={{
          border: 'none',
          borderRadius: 2,
          backgroundColor: '#fff',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '0.875rem',

          // Header styling
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            fontSize: '0.75rem',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          '& .MuiDataGrid-columnSeparator': {
            display: 'none',
          },

          // Row styling
          '& .MuiDataGrid-row': {
            borderBottom: '1px solid #f3f4f6',
            '&:hover': {
              backgroundColor: '#f9fafb',
            },
            '&.Mui-selected, &.row-selected': {
              backgroundColor: '#eff6ff',
              '&:hover': {
                backgroundColor: '#dbeafe',
              },
            },
            '&.row-read-only': {
              backgroundColor: '#f8fafc',
              opacity: 0.8,
              '& .MuiDataGrid-cell': {
                color: '#64748b',
              },
              '&:hover': {
                backgroundColor: '#f1f5f9',
              },
            },
          },

          // Cell styling
          '& .MuiDataGrid-cell': {
            borderBottom: 'none',
            fontSize: '0.875rem',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            '&:focus': {
              outline: '2px solid #3b82f6',
              outlineOffset: '-2px',
            },
            '&:focus-within': {
              outline: '2px solid #3b82f6',
              outlineOffset: '-2px',
            },
          },

          // Editable cell styling
          '& .MuiDataGrid-cell--editable': {
            cursor: 'text',
            '&:hover': {
              backgroundColor: '#f0f9ff',
            },
          },

          // Input styling when editing
          '& .MuiInputBase-root': {
            fontSize: '0.875rem',
            textAlign: 'center',
          },
          '& .MuiInputBase-input': {
            textAlign: 'center',
          },
          '& .MuiDataGrid-editInputCell': {
            padding: '0 8px',
          },

          // Footer styling
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          },

          // Scrollbar styling
          '& .MuiDataGrid-virtualScroller': {
            backgroundColor: '#fff',
          },

          // Remove focus ring on column header
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
        }}
        />
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {/* Cell operations - only show if a cell was clicked */}
        {contextMenu?.field && (
          <>
            <MenuItem onClick={handleCutCell} disabled={contextMenu?.row.readOnly || !canCutCell}>
              <ListItemIcon>
                <Scissors size={16} />
              </ListItemIcon>
              <ListItemText>Cut cell</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCopyCell}>
              <ListItemIcon>
                <Copy size={16} />
              </ListItemIcon>
              <ListItemText>Copy cell</ListItemText>
            </MenuItem>
            <MenuItem onClick={handlePasteCell} disabled={contextMenu?.row.readOnly || !canCutCell}>
              <ListItemIcon>
                <ClipboardPaste size={16} />
              </ListItemIcon>
              <ListItemText>Paste</ListItemText>
            </MenuItem>
            <Divider />
          </>
        )}
        {/* Row operations */}
        <MenuItem onClick={handleCopyRow}>
          <ListItemIcon>
            <Rows size={16} />
          </ListItemIcon>
          <ListItemText>Copy row</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleInsertRowAbove}>
          <ListItemIcon>
            <ArrowUp size={16} />
          </ListItemIcon>
          <ListItemText>Insert row above</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleInsertRowBelow}>
          <ListItemIcon>
            <ArrowDown size={16} />
          </ListItemIcon>
          <ListItemText>Insert row below</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleToggleReadOnly}>
          <ListItemIcon>
            {contextMenu?.row.readOnly ? <LockOpen size={16} /> : <Lock size={16} />}
          </ListItemIcon>
          <ListItemText>{contextMenu?.row.readOnly ? 'Make editable' : 'Read only'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleRemoveRow} disabled={contextMenu?.row.readOnly} sx={{ color: contextMenu?.row.readOnly ? 'text.disabled' : 'error.main' }}>
          <ListItemIcon>
            <Trash2 size={16} color={contextMenu?.row.readOnly ? '#9ca3af' : '#d32f2f'} />
          </ListItemIcon>
          <ListItemText>Remove row</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={20} color="#f59e0b" />
          Delete Planner Entry
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This entry was imported from the planner. Are you sure you want to delete it?
          </DialogContentText>
          {entryToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9fafb', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>{entryToDelete.time}</strong> - {entryToDelete.track} R{entryToDelete.raceNumber}
              </Typography>
              {entryToDelete.backBet?.bookie && (
                <Typography variant="body2" color="text.secondary">
                  Bookie: {entryToDelete.backBet.bookie}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
