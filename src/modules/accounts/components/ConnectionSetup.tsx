'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material'
import { Building2, Mail, ExternalLink, CheckCircle2, AlertCircle, Wallet } from 'lucide-react'
import { useBasiqConnection } from '../hooks/useBasiqConnection'

// ============================================================================
// Types
// ============================================================================

interface ConnectionSetupProps {
  onComplete?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ConnectionSetup({ onComplete }: ConnectionSetupProps) {
  const {
    connectionStatus,
    isConnected,
    isLoading,
    error,
    apiHealthy,
    checkApiHealth,
    createUser,
    getConsentUrl,
    refreshAccounts,
    accounts,
    connections,
  } = useBasiqConnection()

  const [activeStep, setActiveStep] = useState(0)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [consentUrl, setConsentUrl] = useState<string | null>(null)

  // Check API health on mount
  useEffect(() => {
    checkApiHealth()
  }, [checkApiHealth])

  // Determine initial step based on connection status
  useEffect(() => {
    if (isConnected && accounts.length > 0) {
      setActiveStep(3) // Complete
    } else if (connectionStatus?.userId) {
      setActiveStep(1) // Connect bank
    }
  }, [isConnected, accounts.length, connectionStatus?.userId])

  // Email validation
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) {
      setEmailError('Email is required')
      return false
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError(null)
    return true
  }

  // Step 1: Create user
  const handleCreateUser = async () => {
    if (!validateEmail(email)) return

    const userId = await createUser(email)
    if (userId) {
      setActiveStep(1)
    }
  }

  // Step 2: Get consent URL and open
  const handleConnectBank = async () => {
    const url = await getConsentUrl()
    if (url) {
      setConsentUrl(url)
      // Open in new window
      window.open(url, '_blank', 'width=600,height=700')
    }
  }

  // Step 3: Check connection
  const handleCheckConnection = async () => {
    await refreshAccounts()
    if (accounts.length > 0) {
      setActiveStep(3)
    }
  }

  // Complete setup
  const handleComplete = () => {
    onComplete?.()
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Wallet size={24} color="#1976d2" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Connect Your Bank
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Securely connect your bank to track betting transactions
          </Typography>
        </Box>
      </Box>

      {apiHealthy === false && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Basiq API is not configured. Please add BASIQ_API_KEY to your environment.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Enter Email */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Create Account
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email to create a secure banking connection.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (emailError) validateEmail(e.target.value)
                }}
                error={!!emailError}
                helperText={emailError}
                disabled={isLoading}
                InputProps={{
                  startAdornment: <Mail size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                }}
              />
              <Button
                variant="contained"
                onClick={handleCreateUser}
                disabled={isLoading || !email}
                sx={{ minWidth: 100, height: 56 }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Next'}
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 2: Connect Bank */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Connect Bank
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click below to securely connect your bank through Basiq. A new window will open.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Button
                variant="contained"
                startIcon={<ExternalLink size={18} />}
                onClick={handleConnectBank}
                disabled={isLoading}
                sx={{ alignSelf: 'flex-start' }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Open Bank Connection'}
              </Button>

              {consentUrl && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Complete the connection in the opened window, then click "Check Connection" below.
                  </Typography>
                </Alert>
              )}

              <Button
                variant="outlined"
                onClick={handleCheckConnection}
                disabled={isLoading}
                sx={{ alignSelf: 'flex-start', mt: 1 }}
              >
                {isLoading ? <CircularProgress size={20} /> : 'Check Connection'}
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 3: Verify */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Verify Connection
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which accounts to track for betting transactions.
            </Typography>

            {accounts.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Waiting for bank connection...</Typography>
              </Box>
            ) : (
              <List dense>
                {accounts.map(account => (
                  <ListItem key={account.id}>
                    <ListItemIcon>
                      <Building2 size={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary={account.institution.name}
                      secondary={`${account.class.product} - ${account.accountNo}`}
                    />
                    <Chip
                      label={`$${parseFloat(account.balance).toLocaleString()}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Button
              variant="contained"
              onClick={() => setActiveStep(3)}
              disabled={accounts.length === 0}
              sx={{ mt: 2 }}
            >
              Continue
            </Button>
          </StepContent>
        </Step>

        {/* Step 4: Complete */}
        <Step>
          <StepLabel>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              All Set
            </Typography>
          </StepLabel>
          <StepContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircle2 size={32} color="#2e7d32" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Bank Connected Successfully
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''} linked
                </Typography>
              </Box>
            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Your transactions will now be automatically fetched and matched with your betting activity.
              </Typography>
            </Alert>

            <Button variant="contained" onClick={handleComplete}>
              Go to Accounts
            </Button>
          </StepContent>
        </Step>
      </Stepper>

      {/* Connection Status Footer */}
      {connectionStatus?.userId && (
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            User ID: {connectionStatus.userId}
          </Typography>
          {connectionStatus.lastFetchedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Last synced: {new Date(connectionStatus.lastFetchedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  )
}
