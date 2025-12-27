import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Link,
  Divider,
  Paper,
  IconButton,
  Popover,
  Button,
} from '@mui/material'
import { ChevronDown, ExternalLink, Shield, Info, StickyNote, Save, X } from 'lucide-react'
import { type BookieData } from '../data/bookieListData'
import {
  RichTextEditor,
  MenuButtonBold,
  MenuButtonItalic,
  MenuButtonUnderline,
  MenuButtonBulletedList,
  MenuButtonOrderedList,
  MenuControlsContainer,
  MenuDivider,
  type RichTextEditorRef,
} from 'mui-tiptap'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

// Helper functions for localStorage notes
const getBookieNotes = (bookieId: number): string => {
  const notes = localStorage.getItem(`bookie-notes-${bookieId}`)
  return notes || ''
}

const saveBookieNotes = (bookieId: number, notes: string): void => {
  localStorage.setItem(`bookie-notes-${bookieId}`, notes)
}

interface BookieDetailPanelProps {
  bookie: BookieData
}

// Get value category from account setup notes
const getValueCategory = (notes: string): { label: string; color: 'success' | 'warning' | 'error' | 'default' } => {
  const upper = notes.toUpperCase()
  if (upper.includes('EXTREMELY VALUABLE')) {
    return { label: 'EXTREMELY VALUABLE', color: 'success' }
  }
  if (upper.includes('MODERATELY VALUABLE')) {
    return { label: 'MODERATELY VALUABLE', color: 'warning' }
  }
  if (upper.includes('LIMITED VALUE')) {
    return { label: 'LIMITED VALUE', color: 'error' }
  }
  if (upper.includes('NO VALUE')) {
    return { label: 'NO VALUE', color: 'error' }
  }
  return { label: 'UNKNOWN', color: 'default' }
}

export function BookieDetailPanel({ bookie }: BookieDetailPanelProps) {
  const [expanded, setExpanded] = useState<string | false>(false)
  const [notesAnchor, setNotesAnchor] = useState<HTMLButtonElement | null>(null)
  const [userNotes, setUserNotes] = useState('')
  const [hasNotes, setHasNotes] = useState(false)
  const rteRef = useRef<RichTextEditorRef>(null)

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = getBookieNotes(bookie.id)
    setUserNotes(savedNotes)
    setHasNotes(savedNotes.length > 0)
  }, [bookie.id])

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false)
  }

  const handleNotesOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNotesAnchor(event.currentTarget)
  }

  const handleNotesClose = () => {
    setNotesAnchor(null)
  }

  const handleNotesSave = () => {
    const content = rteRef.current?.editor?.getHTML() || ''
    saveBookieNotes(bookie.id, content)
    setUserNotes(content)
    setHasNotes(content.length > 0 && content !== '<p></p>')
    handleNotesClose()
  }

  const notesOpen = Boolean(notesAnchor)

  const valueCategory = getValueCategory(bookie.accountSetupNotes)

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        border: '2px solid',
        borderColor: 'grey.400',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {bookie.bookie}
        </Typography>
        <Chip
          label={valueCategory.label}
          size="small"
          color={valueCategory.color}
          variant="filled"
        />
        {bookie.linkedBookies && (
          <Chip
            label={bookie.linkedBookies}
            size="small"
            variant="outlined"
            color="info"
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={handleNotesOpen}
          size="small"
          sx={{
            border: '1px solid',
            borderColor: hasNotes ? 'primary.main' : 'grey.300',
            bgcolor: hasNotes ? 'primary.50' : 'transparent',
            '&:hover': { bgcolor: hasNotes ? 'primary.100' : 'grey.100' },
          }}
          aria-label="Add notes"
        >
          <StickyNote size={18} />
        </IconButton>
      </Box>

      {/* Notes Popover */}
      <Popover
        open={notesOpen}
        anchorEl={notesAnchor}
        onClose={handleNotesClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 400, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">Notes for {bookie.bookie}</Typography>
            <IconButton size="small" onClick={handleNotesClose}>
              <X size={16} />
            </IconButton>
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 2 }}>
            <RichTextEditor
              ref={rteRef}
              extensions={[StarterKit, Underline]}
              content={userNotes}
              renderControls={() => (
                <MenuControlsContainer>
                  <MenuButtonBold />
                  <MenuButtonItalic />
                  <MenuButtonUnderline />
                  <MenuDivider />
                  <MenuButtonBulletedList />
                  <MenuButtonOrderedList />
                </MenuControlsContainer>
              )}
              RichTextFieldProps={{
                variant: 'standard',
                sx: {
                  minHeight: 150,
                  '& .MuiTiptap-FieldContainer-root': {
                    minHeight: 120,
                  },
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleNotesClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Save size={16} />}
              onClick={handleNotesSave}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Popover>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 3,
          mb: 2,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Ban Risk
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.banRisk || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Stat Dec Risk
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.statDecRisk || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Promo Volume
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.promoVolume || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Odds Rating
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.oddsRating || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Min Runners
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.minimumRunners || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Website
          </Typography>
          {bookie.website && bookie.website !== 'APP ONLY' ? (
            <Link
              href={bookie.website}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
            >
              <ExternalLink size={14} />
              Visit
            </Link>
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {bookie.website === 'APP ONLY' ? 'APP ONLY' : '-'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Second row of metadata */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 3,
          mb: 2,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Software
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.bookieSoftware || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            State
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.stateOfRegistration || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Horse System
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.horseSystem || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Sport System
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.sportSystem || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Female Accounts
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.femaleAccounts || '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Learn Betfair First
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {bookie.learnBetfairFirst || '-'}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Accordion
        expanded={expanded === 'signup'}
        onChange={handleChange('signup')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ChevronDown size={20} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info size={18} />
            <Typography variant="subtitle2">Sign Up Offers</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {bookie.signUpOffers || 'No sign up offer information available.'}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'setup'}
        onChange={handleChange('setup')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ChevronDown size={20} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info size={18} />
            <Typography variant="subtitle2">Account Setup Notes</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {bookie.accountSetupNotes || 'No account setup notes available.'}
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={expanded === 'defence'}
        onChange={handleChange('defence')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ChevronDown size={20} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield size={18} />
            <Typography variant="subtitle2">Defence Notes</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {bookie.defenceNotes || 'No defence notes available.'}
          </Typography>
        </AccordionDetails>
      </Accordion>

    </Paper>
  )
}
