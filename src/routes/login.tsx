import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Stack,
  Alert,
} from '@mui/material'

const DUMMY_USER = {
  email: 'adam.willis007@gmail.com',
  password: 'password',
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (email === DUMMY_USER.email && password === DUMMY_USER.password) {
      navigate({ to: '/dashboard' })
    } else {
      setError('Invalid email or password')
    }
  }

  return (
    <Box className="min-h-screen flex">
      {/* Left side - Login Form (20%) */}
      <Box
        className="w-full lg:w-[20%] flex flex-col justify-between p-6 lg:p-8"
        sx={{ backgroundColor: 'background.paper' }}
      >
        {/* Logo */}
        <Box>
          <Link to="/" className="no-underline">
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                letterSpacing: '-0.5px',
              }}
            >
              Systematic
            </Typography>
          </Link>
        </Box>

        {/* Login Form */}
        <Box className="w-full">
          <Typography
            variant="body1"
            color="text.secondary"
            className="mb-6"
          >
            Log in to your account
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && (
                <Alert severity="error" sx={{ py: 0 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <FormControlLabel
                control={<Checkbox size="small" />}
                label={
                  <Typography variant="body2" color="text.secondary">
                    Remember Email
                  </Typography>
                }
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  textTransform: 'none',
                  py: 1.5,
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                Continue
              </Button>

              <Stack
                direction="column"
                spacing={0.5}
                alignItems="center"
              >
                <Link to="/" className="no-underline">
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Forgot your password?
                  </Typography>
                </Link>
                <Link to="/" className="no-underline">
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Trouble logging in?
                  </Typography>
                </Link>
              </Stack>
            </Stack>
          </form>
        </Box>

        {/* Footer Links */}
        <Stack direction="row" spacing={2}>
          <Link to="/" className="no-underline">
            <Typography
              variant="caption"
              sx={{
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Privacy Notice
            </Typography>
          </Link>
          <Typography variant="caption" color="text.secondary">
            |
          </Typography>
          <Link to="/" className="no-underline">
            <Typography
              variant="caption"
              sx={{
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Terms Of Use
            </Typography>
          </Link>
        </Stack>
      </Box>

      {/* Right side - Branding Image (80%) */}
      <Box
        className="hidden lg:block lg:w-[80%] relative"
        sx={{
          backgroundColor: '#f5f0eb',
          backgroundImage: 'linear-gradient(135deg, #f5f0eb 0%, #e8ddd4 100%)',
        }}
      >
        {/* Decorative grid pattern */}
        <Box
          className="absolute inset-0"
          sx={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Brand content */}
        <Box className="absolute inset-0 flex items-center justify-center p-8">
          <Box className="text-center">
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                }}
              >
                EM
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                mb: 1,
              }}
            >
              Systematic
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Matched Betting Platform
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
