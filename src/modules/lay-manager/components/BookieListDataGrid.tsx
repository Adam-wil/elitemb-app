import { useRef, useEffect, useCallback, useState } from 'react'
import { Box, Typography, Link, Chip } from '@mui/material'
import { DataGridPro, type GridColDef, type GridRenderCellParams, useGridApiRef } from '@mui/x-data-grid-pro'
import { ExternalLink } from 'lucide-react'
import { type BookieData } from '../data/bookieListData'

interface BookieListDataGridProps {
  rows: BookieData[]
}

// Risk level chip colors
const getRiskChipColor = (risk: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (risk.toUpperCase()) {
    case 'LOW':
      return 'success'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
    case 'INSTANT':
      return 'error'
    default:
      return 'default'
  }
}

// Promo volume chip colors
const getPromoVolumeColor = (volume: string): 'success' | 'warning' | 'error' | 'default' => {
  switch (volume.toUpperCase()) {
    case 'HIGH':
      return 'success'
    case 'MEDIUM':
      return 'warning'
    case 'LOW':
    case 'NEXT TO NONE':
      return 'error'
    default:
      return 'default'
  }
}

const columns: GridColDef<BookieData>[] = [
  {
    field: 'bookie',
    headerName: 'Bookie',
    width: 150,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {params.value}
      </Typography>
    ),
  },
  {
    field: 'signUpOffers',
    headerName: 'Sign Up Offers',
    width: 350,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'justify' }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'linkedBookies',
    headerName: 'Linked Bookies',
    width: 160,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'accountSetupNotes',
    headerName: 'Account Setup Notes',
    width: 450,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'justify' }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'promoVolume',
    headerName: 'Promo Volume',
    width: 140,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value) return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={getPromoVolumeColor(value)}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'banRisk',
    headerName: 'Ban Risk',
    width: 120,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value) return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={getRiskChipColor(value)}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'defenceNotes',
    headerName: 'Defence Notes',
    width: 400,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'justify' }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'statDecRisk',
    headerName: 'Stat Dec Risk',
    width: 130,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value) return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={getRiskChipColor(value)}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'horseSystem',
    headerName: 'Horse System',
    width: 130,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value || value === '-') return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={value === 'Yes' ? 'success' : 'default'}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'sportSystem',
    headerName: 'Sport System',
    width: 130,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value || value === '-') return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={value === 'Yes' ? 'success' : 'default'}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'femaleAccounts',
    headerName: 'Female Accounts',
    width: 150,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value || value === '-') return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={value === 'Yes' ? 'success' : 'default'}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'learnBetfairFirst',
    headerName: 'Learn Betfair First',
    width: 160,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value || value === '-') return '-'
      return (
        <Chip
          label={value}
          size="small"
          color={value === 'Yes' ? 'warning' : 'default'}
          variant="outlined"
        />
      )
    },
  },
  {
    field: 'oddsRating',
    headerName: 'Odds Rating',
    width: 110,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'minimumRunners',
    headerName: 'Minimum Runners',
    width: 200,
    renderCell: (params: GridRenderCellParams<BookieData>) => (
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
        {params.value || '-'}
      </Typography>
    ),
  },
  {
    field: 'bookieSoftware',
    headerName: 'Software',
    width: 130,
  },
  {
    field: 'stateOfRegistration',
    headerName: 'State',
    width: 80,
  },
  {
    field: 'website',
    headerName: 'Website',
    width: 90,
    renderCell: (params: GridRenderCellParams<BookieData>) => {
      const value = params.value as string
      if (!value || value === 'APP ONLY') {
        return <Typography variant="body2" color="text.secondary">{value || '-'}</Typography>
      }
      return (
        <Link
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ExternalLink size={16} />
        </Link>
      )
    },
  },
]

export function BookieListDataGrid({ rows }: BookieListDataGridProps) {
  const apiRef = useGridApiRef()
  const topScrollRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)

  // Sync top scrollbar with grid
  const handleTopScroll = useCallback(() => {
    if (topScrollRef.current && apiRef.current) {
      const scrollContainer = apiRef.current.rootElementRef?.current?.querySelector('.MuiDataGrid-virtualScroller')
      if (scrollContainer) {
        scrollContainer.scrollLeft = topScrollRef.current.scrollLeft
      }
    }
  }, [apiRef])

  // Update scroll width when grid mounts
  useEffect(() => {
    const updateScrollWidth = () => {
      if (apiRef.current) {
        const scrollContainer = apiRef.current.rootElementRef?.current?.querySelector('.MuiDataGrid-virtualScroller')
        if (scrollContainer) {
          setScrollWidth(scrollContainer.scrollWidth)
          // Sync grid scroll to top scrollbar
          const handleGridScroll = () => {
            if (topScrollRef.current) {
              topScrollRef.current.scrollLeft = scrollContainer.scrollLeft
            }
          }
          scrollContainer.addEventListener('scroll', handleGridScroll)
          return () => scrollContainer.removeEventListener('scroll', handleGridScroll)
        }
      }
    }
    const timeout = setTimeout(updateScrollWidth, 100)
    return () => clearTimeout(timeout)
  }, [apiRef, rows])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top scrollbar */}
      <Box
        ref={topScrollRef}
        onScroll={handleTopScroll}
        sx={{
          overflowX: 'scroll',
          overflowY: 'hidden',
          mb: 1,
          height: 20,
          bgcolor: '#e0e0e0',
          borderRadius: 1,
          '&::-webkit-scrollbar': {
            height: 16,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#e0e0e0',
            borderRadius: 8,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#666',
            borderRadius: 8,
            border: '3px solid #e0e0e0',
            '&:hover': {
              backgroundColor: '#444',
            },
          },
        }}
      >
        <Box sx={{ width: scrollWidth > 0 ? scrollWidth : 3000, height: 1 }} />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 400 }}>
        <DataGridPro
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          density="comfortable"
          getRowHeight={() => 'auto'}
          disableRowSelectionOnClick
          initialState={{
            sorting: {
              sortModel: [{ field: 'id', sort: 'asc' }],
            },
            pinnedColumns: {
              left: ['bookie'],
            },
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              py: 1,
              alignItems: 'flex-start',
            },
            '& .MuiDataGrid-row': {
              minHeight: '52px !important',
            },
            // Enhanced horizontal scrollbar (bottom)
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: 14,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#e0e0e0',
                borderRadius: 7,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#666',
                borderRadius: 7,
                border: '2px solid #e0e0e0',
                '&:hover': {
                  backgroundColor: '#444',
                },
              },
            },
            // Show scrollbar always
            '& .MuiDataGrid-scrollbar--horizontal': {
              display: 'block !important',
            },
          }}
        />
      </Box>
    </Box>
  )
}
