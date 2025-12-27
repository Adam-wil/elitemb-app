'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  TextField,
  Select,
  FormControl,
  InputLabel,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { RefreshCw, CheckCircle, Plus, Trash2, AlertTriangle, ArrowUp, ArrowDown, Copy, Scissors, Lock, LockOpen, Rows, ClipboardPaste } from 'lucide-react'
import type { GridColDef, GridRenderCellParams, GridValueGetter, GridValueSetter, GridRowId, GridRenderEditCellParams } from '@mui/x-data-grid-premium'
import type { TrackedRaceEntry, RaceOutcome, RaceResultData } from '../types'
import { OUTCOME_CONFIG, type UnitTier } from '../types'
import { convertRaceTime } from '../utils/timezones'
import { getCommissionForTrack, type StateCommissionRate } from '../utils/trackerStorage'
import { getAllPendingBonuses, getBonusById, type Bonus } from '@/modules/the-stable'

// Unit values for autocomplete
const UNIT_VALUES = ['0.5', '1', '2', '3', '4', '5']

/**
 * Normalize time input to 24-hour format (HH:mm)
 * Handles various formats: "2pm", "2:30pm", "2.30pm", "14:30", "14.30", "1430", "930", etc.
 */
function normalizeTimeTo24Hr(input: string): string {
  if (!input) return input

  const trimmed = input.trim().toLowerCase()

  // Already in HH:mm format (colon separator)
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
  }

  // Format with period separator: "2.30", "14.30"
  if (/^\d{1,2}\.\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split('.').map(Number)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
  }

  // Format: "2pm", "2am", "12pm", "12am"
  const simpleMatch = trimmed.match(/^(\d{1,2})\s*(am|pm)$/)
  if (simpleMatch) {
    let hour = parseInt(simpleMatch[1], 10)
    const isPM = simpleMatch[2] === 'pm'

    if (hour === 12) {
      hour = isPM ? 12 : 0
    } else if (isPM) {
      hour += 12
    }

    if (hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:00`
    }
  }

  // Format: "2:30pm", "2:30 pm", "12:30am" (colon separator with am/pm)
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
  if (colonMatch) {
    let hour = parseInt(colonMatch[1], 10)
    const minute = parseInt(colonMatch[2], 10)
    const isPM = colonMatch[3] === 'pm'

    if (hour === 12) {
      hour = isPM ? 12 : 0
    } else if (isPM) {
      hour += 12
    }

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  // Format: "2.30pm", "2.30 pm", "12.30am" (period separator with am/pm)
  const periodMatch = trimmed.match(/^(\d{1,2})\.(\d{2})\s*(am|pm)$/)
  if (periodMatch) {
    let hour = parseInt(periodMatch[1], 10)
    const minute = parseInt(periodMatch[2], 10)
    const isPM = periodMatch[3] === 'pm'

    if (hour === 12) {
      hour = isPM ? 12 : 0
    } else if (isPM) {
      hour += 12
    }

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  // Format: "1430" or "930" (3-4 digits without separator)
  if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, '0')
    const hour = parseInt(padded.slice(0, 2), 10)
    const minute = parseInt(padded.slice(2, 4), 10)

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  // Return original if no pattern matched
  return input
}

// All available bookies for autocomplete - Major bookies first, then alphabetical
const BOOKIES = [
  // Major bookies (prioritized)
  'TAB',
  'Sportsbet',
  'Bet365',
  'Ladbrokes',
  'Neds',
  'PointsBet',
  'Betr',
  'Unibet',
  'BetRight',
  'Dabble',
  'TABtouch',
  'PlayUp',
  // Rest alphabetically
  'AlphaBet',
  'BaggyBet',
  'BearBet',
  'Bet Local',
  'Bet Royale',
  'Bet66',
  'BetAus',
  'BetBlitz',
  'BetBuzz',
  'BetChamps',
  'BetDeluxe',
  'BetEstate',
  'BetFocus',
  'BetGalaxy',
  'BetGold',
  'BetJet',
  'BetKings',
  'BetM',
  'BetNation',
  'BetProfessor',
  'BetReal',
  'BetXpress',
  'BetYouCan',
  'Betzooka',
  'BigBet',
  'BlondeBet',
  'BoomBet',
  'BossBet',
  'BuffaloBet',
  'ChaseBet',
  'Colossal',
  'CrossBet',
  'DiamondBet',
  'DowBet',
  'EliteBet',
  'FiestaBet',
  'GoldBet',
  'GoldenRush',
  'HavaBet',
  'HotBet',
  'JungleBet',
  'JustBet',
  'LightningBet',
  'MarantelliBet',
  'MidasBet',
  'MightyBet',
  'MintBet',
  'MyBet',
  'Next2Go',
  'Noisy',
  'OkeBet',
  'OldGill',
  'PalmerBet',
  'PickleBet',
  'PlayWest',
  'PonyBet',
  'PremiumBet',
  'PulseBet',
  'Punt123',
  'PuntGenie',
  'PuntNow',
  'QuestBet',
  'Razoo',
  'ReadyBet',
  'RealBookie',
  'Rob Waterhouse',
  'Sterling Parker',
  'Surge',
  'SwiftBet',
  'TerryBet',
  'TopBet',
  'TradieBet',
  'TrueBet',
  'UltraBet',
  'UpCoz',
  'VicBet',
  'VikingBet',
  'VolcanoBet',
  'WellBet',
  'WinnersBet',
  'WishBet',
  'WizBet',
  'YesBet',
  'ZBet',
]

// Australian and NZ racing tracks (150+)
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

// Custom edit cell for bookie with type-ahead autocomplete
// Type to filter, arrow up/down to navigate, right arrow or Enter to select
function BookieEditCell(props: GridRenderEditCellParams<TrackedRaceEntry>) {
  const { id, value, field, api } = props
  const [inputValue, setInputValue] = useState(value || '')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter bookies based on input
  const filteredBookies = useMemo(() => {
    if (!inputValue) return BOOKIES.slice(0, 10)
    const lower = inputValue.toLowerCase()
    return BOOKIES.filter(b => b.toLowerCase().includes(lower)).slice(0, 10)
  }, [inputValue])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    setHighlightIndex(0)
    setShowSuggestions(true)
    api.setEditCellValue({ id, field, value: newValue })
  }

  const selectHighlighted = () => {
    if (filteredBookies.length > 0 && highlightIndex < filteredBookies.length) {
      const selected = filteredBookies[highlightIndex]
      setInputValue(selected)
      api.setEditCellValue({ id, field, value: selected })
      api.stopCellEditMode({ id, field })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filteredBookies.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (event.key === 'ArrowRight' && filteredBookies.length > 0) {
      event.preventDefault()
      selectHighlighted()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filteredBookies.length > 0 && showSuggestions) {
        selectHighlighted()
      } else {
        api.stopCellEditMode({ id, field })
      }
    } else if (event.key === 'Escape') {
      api.stopCellEditMode({ id, field })
    } else if (event.key === 'Tab') {
      if (filteredBookies.length > 0 && showSuggestions && inputValue) {
        selectHighlighted()
      }
      api.stopCellEditMode({ id, field })
    }
  }

  const handleBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      api.stopCellEditMode({ id, field })
    }, 150)
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Type bookie..."
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          fontSize: '0.875rem',
          textAlign: 'center',
          backgroundColor: 'transparent',
          padding: '0 8px',
        }}
      />
      {showSuggestions && filteredBookies.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 1,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {filteredBookies.map((bookie, index) => (
            <Box
              key={bookie}
              onMouseDown={() => {
                setInputValue(bookie)
                api.setEditCellValue({ id, field, value: bookie })
                api.stopCellEditMode({ id, field })
              }}
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: index === highlightIndex ? '#dbeafe' : 'transparent',
                '&:hover': { backgroundColor: '#f3f4f6' },
              }}
            >
              {bookie}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// Custom edit cell for track with type-ahead autocomplete
// Type to filter, arrow up/down to navigate, right arrow or Enter to select
function TrackEditCell(props: GridRenderEditCellParams<TrackedRaceEntry>) {
  const { id, value, field, api } = props
  const [inputValue, setInputValue] = useState(value || '')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter tracks based on input
  const filteredTracks = useMemo(() => {
    if (!inputValue) return TRACKS.slice(0, 10)
    const lower = inputValue.toLowerCase()
    return TRACKS.filter(t => t.toLowerCase().includes(lower)).slice(0, 10)
  }, [inputValue])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    setHighlightIndex(0)
    setShowSuggestions(true)
    api.setEditCellValue({ id, field, value: newValue })
  }

  const selectHighlighted = () => {
    if (filteredTracks.length > 0 && highlightIndex < filteredTracks.length) {
      const selected = filteredTracks[highlightIndex]
      setInputValue(selected)
      api.setEditCellValue({ id, field, value: selected })
      api.stopCellEditMode({ id, field })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex(prev => Math.min(prev + 1, filteredTracks.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex(prev => Math.max(prev - 1, 0))
    } else if (event.key === 'ArrowRight' && filteredTracks.length > 0) {
      event.preventDefault()
      selectHighlighted()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filteredTracks.length > 0 && showSuggestions) {
        selectHighlighted()
      } else {
        api.stopCellEditMode({ id, field })
      }
    } else if (event.key === 'Escape') {
      api.stopCellEditMode({ id, field })
    } else if (event.key === 'Tab') {
      if (filteredTracks.length > 0 && showSuggestions && inputValue) {
        selectHighlighted()
      }
      api.stopCellEditMode({ id, field })
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      api.stopCellEditMode({ id, field })
    }, 150)
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Type track..."
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          fontSize: '0.875rem',
          textAlign: 'center',
          backgroundColor: 'transparent',
          padding: '0 8px',
        }}
      />
      {showSuggestions && filteredTracks.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 1,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            zIndex: 1000,
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {filteredTracks.map((track, index) => (
            <Box
              key={track}
              onMouseDown={() => {
                setInputValue(track)
                api.setEditCellValue({ id, field, value: track })
                api.stopCellEditMode({ id, field })
              }}
              sx={{
                px: 1,
                py: 0.5,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: index === highlightIndex ? '#dbeafe' : 'transparent',
                '&:hover': { backgroundColor: '#f3f4f6' },
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

// Custom edit cell for units with native datalist autocomplete (no dropdown)
function UnitsEditCell(props: GridRenderEditCellParams<TrackedRaceEntry>) {
  const { id, value, field, api } = props
  const [inputValue, setInputValue] = useState(value || '')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    setInputValue(newValue)
    api.setEditCellValue({ id, field, value: newValue })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      api.stopCellEditMode({ id, field })
    } else if (event.key === 'Escape') {
      api.stopCellEditMode({ id, field })
    }
  }

  const handleBlur = () => {
    api.stopCellEditMode({ id, field })
  }

  return (
    <>
      <input
        type="text"
        list="units-list"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          outline: 'none',
          fontSize: '0.875rem',
          textAlign: 'center',
          backgroundColor: 'transparent',
          padding: '0 8px',
        }}
      />
      <datalist id="units-list">
        {UNIT_VALUES.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
    </>
  )
}

// Custom edit cell for bonus selection
function BonusEditCell(props: GridRenderEditCellParams<TrackedRaceEntry>) {
  const { id, value, field, api, row } = props
  const [selectedValue, setSelectedValue] = useState(value || '')

  // Get pending bonuses for the current bookie
  const pendingBonuses = useMemo(() => {
    const bookie = row.backBet?.bookie || ''
    const allPending = getAllPendingBonuses()
    // Filter by bookie if set, otherwise show all
    if (bookie) {
      return allPending.filter((b) => b.bookie.toLowerCase() === bookie.toLowerCase())
    }
    return allPending
  }, [row.backBet?.bookie])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value
    setSelectedValue(newValue)
    api.setEditCellValue({ id, field, value: newValue || undefined })
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      api.stopCellEditMode({ id, field })
    }
  }

  const handleBlur = () => {
    api.stopCellEditMode({ id, field })
  }

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        fontSize: '0.75rem',
        textAlign: 'center',
        backgroundColor: 'transparent',
        padding: '0 4px',
        cursor: 'pointer',
      }}
    >
      <option value="">None</option>
      {pendingBonuses.map((bonus) => (
        <option key={bonus.id} value={bonus.id}>
          ${bonus.amount} - {bonus.bookie} (exp: {bonus.expiryDate.slice(5)})
        </option>
      ))}
    </select>
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
        updates.time = normalizeTimeTo24Hr(value)
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
      case 'unitTier':
        updates.unitTier = value as UnitTier
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
    options?: string[],
    datalistId?: string
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
        <>
          <input
            type={type}
            list={datalistId}
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
          {datalistId === 'bookie-list-mobile' && (
            <datalist id="bookie-list-mobile">
              {BOOKIES.map((b) => <option key={b} value={b} />)}
            </datalist>
          )}
          {datalistId === 'units-list-mobile' && (
            <datalist id="units-list-mobile">
              {UNIT_VALUES.map((u) => <option key={u} value={u} />)}
            </datalist>
          )}
        </>
      )
    }

    return (
      <Box
        onClick={() => !entry.readOnly && handleStartEdit(field, value)}
        sx={{
          cursor: entry.readOnly ? 'default' : 'pointer',
          padding: '10px 12px',
          borderRadius: '8px',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fff',
          border: entry.readOnly ? '1px solid #e5e7eb' : '1.5px solid #d1d5db',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease',
          '&:hover': entry.readOnly ? {} : {
            borderColor: '#3b82f6',
            backgroundColor: '#f0f9ff',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
          },
          '&:active': entry.readOnly ? {} : {
            borderColor: '#2563eb',
            backgroundColor: '#e0f2fe',
          },
        }}
      >
        <Typography variant="body2" sx={{ color: value ? '#1f2937' : '#9ca3af', fontSize: '0.9375rem' }}>
          {value || 'Tap to enter'}
        </Typography>
      </Box>
    )
  }

  const outcomeConfig = entry.outcome ? OUTCOME_CONFIG[entry.outcome] : null

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
              <Box
                onClick={() => !entry.readOnly && handleStartEdit('time', entry.time)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '6px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: entry.readOnly ? 'default' : 'pointer',
                  '&:hover': entry.readOnly ? {} : { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: entry.time ? '#374151' : '#9ca3af' }}>
                  {entry.time || '--:--'}
                </Typography>
              </Box>
            )}
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
              <Box
                onClick={() => !entry.readOnly && handleStartEdit('track', entry.track)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '6px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: entry.readOnly ? 'default' : 'pointer',
                  '&:hover': entry.readOnly ? {} : { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, color: entry.track ? '#1f2937' : '#9ca3af' }}>
                  {entry.track || 'Track'}
                </Typography>
              </Box>
            )}
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
              <Box
                onClick={() => !entry.readOnly && handleStartEdit('raceNumber', entry.raceNumber)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '6px',
                  border: '1.5px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: entry.readOnly ? 'default' : 'pointer',
                  '&:hover': entry.readOnly ? {} : { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
                }}
              >
                <Typography variant="body2" sx={{ color: entry.raceNumber ? '#6b7280' : '#9ca3af' }}>
                  R{entry.raceNumber || '?'}
                </Typography>
              </Box>
            )}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          {editingField === 'selectionNumber' ? (
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                width: '60px',
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
            <Box
              onClick={() => !entry.readOnly && handleStartEdit('selectionNumber', entry.selectionNumber)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: '6px',
                border: '1.5px solid #d1d5db',
                backgroundColor: '#fff',
                minWidth: '48px',
                textAlign: 'center',
                cursor: entry.readOnly ? 'default' : 'pointer',
                '&:hover': entry.readOnly ? {} : { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: entry.selectionNumber ? '#1f2937' : '#9ca3af' }}>
                #{entry.selectionNumber || '?'}
              </Typography>
            </Box>
          )}
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
            <Box
              onClick={() => !entry.readOnly && handleStartEdit('selectionName', entry.selectionName)}
              sx={{
                flex: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: '6px',
                border: '1.5px solid #d1d5db',
                backgroundColor: '#fff',
                cursor: entry.readOnly ? 'default' : 'pointer',
                '&:hover': entry.readOnly ? {} : { borderColor: '#3b82f6', backgroundColor: '#f0f9ff' },
              }}
            >
              <Typography variant="body2" sx={{ color: entry.selectionName ? '#1f2937' : '#9ca3af' }}>
                {entry.selectionName || 'Horse name'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bookie row */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>BOOKIE</Typography>
          {renderEditableField('bookie', entry.backBet?.bookie || '', 'Bookie', 'text', undefined, 'bookie-list-mobile')}
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
            {/* Units and Outcome */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>UNITS</Typography>
                {renderEditableField('unitTier', entry.unitTier || '', 'Units', 'text', undefined, 'units-list-mobile')}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>OUTCOME</Typography>
                {renderEditableField('outcome', entry.outcome || '', 'Outcome', 'select', Object.keys(OUTCOME_CONFIG))}
              </Box>
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
  const editableFields = ['selectionNumber', 'selectionName', 'bookie', 'backStake', 'backOdds', 'layStake', 'layOdds', 'layCommission', 'time', 'track', 'raceNumber', 'unitTier']

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
      } else if (field === 'unitTier') {
        updates.unitTier = '' as UnitTier
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
      } else if (field === 'unitTier') {
        updates.unitTier = clipboardText.trim() as UnitTier
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
    else if (selectedField === 'unitTier') updates.unitTier = '' as UnitTier
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
    else if (selectedField === 'unitTier') updates.unitTier = clipboardText.trim() as UnitTier
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
    // Handle time changes - normalize to 24hr format
    if (newRow.time !== oldRow.time) {
      const normalizedTime = normalizeTimeTo24Hr(newRow.time)
      newRow = { ...newRow, time: normalizedTime }
      onEntryUpdate(newRow.id, { time: normalizedTime })
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
    if (newRow.unitTier !== oldRow.unitTier) {
      onEntryUpdate(newRow.id, { unitTier: newRow.unitTier })
    }
    if (newRow.outcome !== oldRow.outcome) {
      onEntryUpdate(newRow.id, { outcome: newRow.outcome })
    }
    if (newRow.linkedBonusId !== oldRow.linkedBonusId) {
      onEntryUpdate(newRow.id, { linkedBonusId: newRow.linkedBonusId })
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
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.unitTier || '',
      valueSetter: (value: string, row: TrackedRaceEntry) => ({
        ...row,
        unitTier: value as UnitTier,
      }),
      renderEditCell: (params: GridRenderEditCellParams<TrackedRaceEntry>) => <UnitsEditCell {...params} />,
    },
    {
      field: 'selectionNumber',
      headerName: '#',
      width: 55,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
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
      renderEditCell: (params: GridRenderEditCellParams<TrackedRaceEntry>) => <BookieEditCell {...params} />,
    },
    {
      field: 'backStake',
      headerName: 'Stake $',
      width: 100,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      cellClassName: 'cell-back-bet',
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, stake: value || 0 },
      }),
    },
    {
      field: 'backOdds',
      headerName: 'Odds',
      width: 90,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      cellClassName: 'cell-back-bet',
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.backBet?.odds || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        backBet: { ...row.backBet, odds: value || 0 },
      }),
    },
    {
      field: 'layStake',
      headerName: 'Lay $',
      width: 100,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      cellClassName: 'cell-lay-bet',
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.layBet?.stake || '',
      valueSetter: (value: number, row: TrackedRaceEntry) => ({
        ...row,
        layBet: { ...row.layBet, stake: value || 0 },
      }),
    },
    {
      field: 'layOdds',
      headerName: 'Odds',
      width: 90,
      type: 'number' as const,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      cellClassName: 'cell-lay-bet',
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
    },
    {
      field: 'linkedBonusId',
      headerName: 'Bonus',
      width: 130,
      editable: true,
      headerAlign: 'center' as const,
      align: 'center' as const,
      valueGetter: (_value: unknown, row: TrackedRaceEntry) => row.linkedBonusId || '',
      valueSetter: (value: string, row: TrackedRaceEntry) => ({
        ...row,
        linkedBonusId: value || undefined,
      }),
      renderCell: (params: GridRenderCellParams<TrackedRaceEntry>) => {
        const bonusId = params.row.linkedBonusId
        if (!bonusId) {
          return (
            <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.75rem' }}>
              Select...
            </span>
          )
        }
        const bonus = getBonusById(bonusId)
        if (!bonus) {
          return (
            <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.75rem' }}>
              Invalid
            </span>
          )
        }
        return (
          <Tooltip title={`$${bonus.amount} from ${bonus.bookie} (exp: ${bonus.expiryDate})`}>
            <Box
              sx={{
                backgroundColor: bonus.status === 'turned_over' ? '#c8e6c9' : '#bbdefb',
                color: bonus.status === 'turned_over' ? '#2e7d32' : '#1565c0',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 500,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              ${bonus.amount}
            </Box>
          </Tooltip>
        )
      },
      renderEditCell: (params: GridRenderEditCellParams<TrackedRaceEntry>) => <BonusEditCell {...params} />,
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
              Are you sure you want to delete this entry?
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

          // Back bet cells (Stake $, Odds) - light blue
          '& .cell-back-bet': {
            backgroundColor: '#e0f2fe',
          },

          // Lay bet cells (Lay $, Odds) - light yellow for Betfair
          '& .cell-lay-bet': {
            backgroundColor: '#fef9c3',
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
