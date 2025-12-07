import { AppBar, Toolbar, Typography, IconButton, Box, Button } from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'
import { Link } from '@tanstack/react-router'

interface HeaderProps {
  onMenuClick?: () => void
  showLoginButton?: boolean
}

export function Header({ onMenuClick, showLoginButton = true }: HeaderProps) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar className="justify-between">
        <Link to="/" className="no-underline">
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '-0.5px',
            }}
          >
            EliteMB
          </Typography>
        </Link>

        <Box className="flex items-center gap-2">
          {showLoginButton && (
            <Link to="/login" className="no-underline">
              <Button
                variant="contained"
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Login
              </Button>
            </Link>
          )}
          <IconButton
            edge="end"
            color="default"
            aria-label="menu"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
