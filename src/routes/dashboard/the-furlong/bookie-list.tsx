import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material'
import { Search, List, LayoutGrid } from 'lucide-react'
import { BookieListDataGrid } from '@/modules/lay-manager/components/BookieListDataGrid'
import { BookieDetailPanel } from '@/modules/lay-manager/components/BookieDetailPanel'
import { bookieListData } from '@/modules/lay-manager/data/bookieListData'

export const Route = createFileRoute('/dashboard/the-furlong/bookie-list')({
  component: BookieListPage,
})

type ViewMode = 'grid' | 'cards'
type ValueFilter = 'all' | 'extremely' | 'moderately' | 'limited' | 'none'
type RiskFilter = 'all' | 'low' | 'medium' | 'high'

function BookieListPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchText, setSearchText] = useState('')
  const [valueFilter, setValueFilter] = useState<ValueFilter>('all')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')

  const handleViewModeChange = (_: React.SyntheticEvent, newValue: ViewMode) => {
    setViewMode(newValue)
  }

  const handleValueFilterChange = (event: SelectChangeEvent<ValueFilter>) => {
    setValueFilter(event.target.value as ValueFilter)
  }

  const handleRiskFilterChange = (event: SelectChangeEvent<RiskFilter>) => {
    setRiskFilter(event.target.value as RiskFilter)
  }

  const filteredBookies = useMemo(() => {
    let filtered = bookieListData

    // Search filter
    if (searchText) {
      const lowerSearch = searchText.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.bookie.toLowerCase().includes(lowerSearch) ||
          b.linkedBookies.toLowerCase().includes(lowerSearch) ||
          b.bookieSoftware.toLowerCase().includes(lowerSearch)
      )
    }

    // Value filter
    if (valueFilter !== 'all') {
      filtered = filtered.filter((b) => {
        const notes = b.accountSetupNotes.toUpperCase()
        switch (valueFilter) {
          case 'extremely':
            return notes.includes('EXTREMELY VALUABLE')
          case 'moderately':
            return notes.includes('MODERATELY VALUABLE')
          case 'limited':
            return notes.includes('LIMITED VALUE')
          case 'none':
            return notes.includes('NO VALUE')
          default:
            return true
        }
      })
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter((b) => {
        const risk = b.banRisk.toUpperCase()
        switch (riskFilter) {
          case 'low':
            return risk === 'LOW'
          case 'medium':
            return risk === 'MEDIUM'
          case 'high':
            return risk === 'HIGH' || risk === 'INSTANT'
          default:
            return true
        }
      })
    }

    return filtered
  }, [searchText, valueFilter, riskFilter])

  // Group bookies by value category
  const groupedBookies = useMemo(() => {
    const extremely = filteredBookies.filter((b) =>
      b.accountSetupNotes.toUpperCase().includes('EXTREMELY VALUABLE')
    )
    const moderately = filteredBookies.filter((b) =>
      b.accountSetupNotes.toUpperCase().includes('MODERATELY VALUABLE')
    )
    const limited = filteredBookies.filter((b) =>
      b.accountSetupNotes.toUpperCase().includes('LIMITED VALUE')
    )
    const noValue = filteredBookies.filter((b) =>
      b.accountSetupNotes.toUpperCase().includes('NO VALUE')
    )

    return { extremely, moderately, limited, noValue }
  }, [filteredBookies])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Bookie List
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Platinum Squad Bookie List - Last updated 14/11/25
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${filteredBookies.length} bookies`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search bookies..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Value Category</InputLabel>
            <Select
              value={valueFilter}
              label="Value Category"
              onChange={handleValueFilterChange}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="extremely">Extremely Valuable</MenuItem>
              <MenuItem value="moderately">Moderately Valuable</MenuItem>
              <MenuItem value="limited">Limited Value</MenuItem>
              <MenuItem value="none">No Value</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ban Risk</InputLabel>
            <Select
              value={riskFilter}
              label="Ban Risk"
              onChange={handleRiskFilterChange}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High/Instant</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Tabs value={viewMode} onChange={handleViewModeChange}>
            <Tab
              value="grid"
              icon={<List size={18} />}
              iconPosition="start"
              label="Table"
              sx={{ minHeight: 40 }}
            />
            <Tab
              value="cards"
              icon={<LayoutGrid size={18} />}
              iconPosition="start"
              label="Cards"
              sx={{ minHeight: 40 }}
            />
          </Tabs>
        </Box>
      </Paper>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {viewMode === 'grid' ? (
          <Paper sx={{ p: 2, height: '100%' }}>
            <BookieListDataGrid rows={filteredBookies} />
          </Paper>
        ) : (
          <Box>
            {groupedBookies.extremely.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="EXTREMELY VALUABLE" size="small" color="success" />
                  <Typography variant="body2" color="text.secondary">
                    ({groupedBookies.extremely.length} bookies)
                  </Typography>
                </Typography>
                {groupedBookies.extremely.map((bookie) => (
                  <BookieDetailPanel key={bookie.id} bookie={bookie} />
                ))}
              </Box>
            )}

            {groupedBookies.moderately.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="MODERATELY VALUABLE" size="small" color="warning" />
                  <Typography variant="body2" color="text.secondary">
                    ({groupedBookies.moderately.length} bookies)
                  </Typography>
                </Typography>
                {groupedBookies.moderately.map((bookie) => (
                  <BookieDetailPanel key={bookie.id} bookie={bookie} />
                ))}
              </Box>
            )}

            {groupedBookies.limited.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="LIMITED VALUE" size="small" color="error" />
                  <Typography variant="body2" color="text.secondary">
                    ({groupedBookies.limited.length} bookies)
                  </Typography>
                </Typography>
                {groupedBookies.limited.map((bookie) => (
                  <BookieDetailPanel key={bookie.id} bookie={bookie} />
                ))}
              </Box>
            )}

            {groupedBookies.noValue.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="NO VALUE" size="small" color="default" />
                  <Typography variant="body2" color="text.secondary">
                    ({groupedBookies.noValue.length} bookies)
                  </Typography>
                </Typography>
                {groupedBookies.noValue.map((bookie) => (
                  <BookieDetailPanel key={bookie.id} bookie={bookie} />
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
